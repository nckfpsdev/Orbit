import { getIdentity } from "@/lib/supabase/auth";
import { demoEnabled } from "./environment";
import { settingsSchema } from "./validation";
import { DEFAULT_SETTINGS } from "@/lib/domain/constants";
import type { OrgSettings } from "@/lib/domain/types";
import { now, row, run, runtime } from "./db";
import { AppError } from "@/lib/domain/errors";
export { AppError } from "@/lib/domain/errors";
export interface Context {
  userId: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  settings: OrgSettings;
  credits: number;
}
export async function context(): Promise<Context> {
  const user = await getIdentity();
  if (!user)
    throw new AppError(
      "UNAUTHORIZED",
      "Entre com sua conta para continuar.",
      401,
    );
  const session = await row<{ valid: boolean }>(
    "SELECT private.session_valid() AS valid",
  );
  if (!session?.valid)
    throw new AppError(
      "UNAUTHORIZED",
      "Sua sessão terminou. Entre novamente.",
      401,
    );
  const profile = await row<{ profile_json: string }>(
    "SELECT private.bootstrap_profile(?::uuid,?,?,?::jsonb) AS profile_json",
    user.id,
    user.email,
    user.name,
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      provider: demoEnabled() ? "mock" : "osm",
    }),
  );
  if (!profile)
    throw new AppError("FORBIDDEN", "Sessão ou perfil não autorizado.", 403);
  const { user_id: userId, organization_id: orgId } = JSON.parse(
    profile.profile_json,
  ) as { user_id: string; organization_id: string };
  const org = await row<{
    credits: number;
    settings_json: string;
    role: string;
  }>(
    "SELECT o.credits,o.settings_json,m.role FROM organizations o JOIN memberships m ON m.organization_id=o.id WHERE o.id=? AND m.user_id=?",
    orgId,
    userId,
  );
  if (!org)
    throw new AppError("FORBIDDEN", "Acesso ao workspace não autorizado.", 403);
  let settings: OrgSettings = {
    ...DEFAULT_SETTINGS,
    provider: demoEnabled() ? ("mock" as const) : ("osm" as const),
  };
  try {
    const stored = JSON.parse(org.settings_json);
    const parsed = settingsSchema.parse({
      ...DEFAULT_SETTINGS,
      ...stored,
      score_weights: {
        ...DEFAULT_SETTINGS.score_weights,
        ...stored.score_weights,
      },
      credit_costs: {
        ...DEFAULT_SETTINGS.credit_costs,
        ...stored.credit_costs,
      },
      unit_costs: { ...DEFAULT_SETTINGS.unit_costs, ...stored.unit_costs },
    });
    settings = {
      ...parsed,
      provider:
        !demoEnabled() && parsed.provider === "mock" ? "osm" : parsed.provider,
    };
  } catch {
    console.error(
      JSON.stringify({
        event: "invalid_workspace_settings",
        organization_id: orgId,
      }),
    );
  }
  return {
    userId: userId,
    orgId,
    name: user.name,
    email: user.email,
    role: org.role,
    settings,
    credits: org.credits,
  };
}
export function isAdmin(c: Context) {
  const allowed =
    runtime()
      .ADMIN_EMAILS?.split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return (
    ["owner", "admin"].includes(c.role) &&
    allowed.includes(c.email.toLowerCase())
  );
}
export function requireAdmin(c: Context) {
  if (!isAdmin(c))
    throw new AppError(
      "FORBIDDEN",
      "Acesso administrativo não autorizado.",
      403,
    );
}
export function requireOwner(c: Context) {
  if (!["owner", "admin"].includes(c.role))
    throw new AppError("FORBIDDEN", "Acesso ao workspace não autorizado.", 403);
}
export function canManageCredits(c: Context) {
  return isAdmin(c);
}
export function requireCreditManager(c: Context) {
  if (!canManageCredits(c))
    throw new AppError(
      "FORBIDDEN",
      "Apenas o administrador autorizado pode alterar preços e conceder créditos.",
      403,
    );
}
export async function rateLimit(key: string, limit = 30, windowSeconds = 60) {
  const expiry = Math.floor(Date.now() / 1000) + windowSeconds;
  const r = await row<{ count: number; expires_at: number }>(
    "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<=? THEN 1 ELSE rate_limits.count+1 END,expires_at=CASE WHEN rate_limits.expires_at<=? THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count,expires_at",
    key,
    expiry,
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000),
  );
  if (r && r.count > limit)
    throw new AppError(
      "RATE_LIMIT",
      "Limite temporário atingido. Tente novamente em instantes.",
      429,
      Math.max(1, r.expires_at - Math.floor(Date.now() / 1000)),
    );
}
export function checkMutation(request: Request) {
  const origin = request.headers.get("origin");
  const own = new URL(request.url).origin;
  const allowed = runtime().APP_ORIGIN;
  if (origin && origin !== own && origin !== allowed)
    throw new AppError(
      "INVALID_ORIGIN",
      "Origem da solicitação inválida.",
      403,
    );
  if (
    request.method !== "GET" &&
    !request.headers.get("content-type")?.includes("application/json")
  )
    throw new AppError("CONTENT_TYPE", "Envie os dados em JSON.", 415);
  if (Number(request.headers.get("content-length") ?? 0) > 80000)
    throw new AppError("PAYLOAD_TOO_LARGE", "Solicitação muito grande.", 413);
}
export async function audit(
  c: Context,
  action: string,
  target: string | null,
  detail: string,
) {
  await run(
    "INSERT INTO audit_logs (id,organization_id,user_id,action,target_id,detail,created_at) VALUES (?,?,?,?,?,?,?)",
    crypto.randomUUID(),
    c.orgId,
    c.userId,
    action,
    target,
    detail.slice(0, 300),
    now(),
  );
}
export function json(data: unknown, status = 200) {
  return Response.json(
    { data },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
export function errorResponse(e: unknown) {
  if (e instanceof AppError)
    return Response.json(
      {
        error: { code: e.code, message: e.message, retry_after: e.retryAfter },
      },
      {
        status: e.status,
        headers: {
          "Cache-Control": "no-store",
          ...(e.retryAfter ? { "Retry-After": String(e.retryAfter) } : {}),
        },
      },
    );
  if (e && typeof e === "object" && "issues" in e)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Revise os campos informados.",
          fields: (e as { issues: unknown }).issues,
        },
      },
      { status: 422 },
    );
  console.error(
    JSON.stringify({
      event: "orbit_request_failed",
      name: e instanceof Error ? e.name : "UnknownError",
      frames:
        e instanceof Error
          ? e.stack
              ?.split("\n")
              .filter((line) => /^\s*at\s/.test(line))
              .slice(0, 4)
          : [],
    }),
  );
  return Response.json(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message:
          "Não foi possível concluir agora. Seus dados foram preservados; tente novamente.",
      },
    },
    { status: 503 },
  );
}
