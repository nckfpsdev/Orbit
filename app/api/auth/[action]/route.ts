import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeReturnTo } from "@/lib/supabase/redirect";
import { readJson } from "@/lib/server/request-body";
import {
  checkMutation,
  errorResponse,
  json,
  rateLimit,
  AppError,
} from "@/lib/server/security";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const credentials = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    name: z.string().trim().max(180).optional(),
    return_to: z.string().max(1200).optional(),
  })
  .strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    checkMutation(request);
    const { action } = await params;
    if (!["login", "signup", "logout"].includes(action))
      throw new AppError("NOT_FOUND", "Ação não encontrada.", 404);
    const client = await createClient();
    if (action === "logout") {
      const { error } = await client.auth.signOut({ scope: "global" });
      if (error)
        throw new AppError(
          "AUTH_UNAVAILABLE",
          "Não foi possível encerrar a sessão. Tente novamente.",
          503,
        );
      return json({ redirect: "/login" });
    }
    const input = credentials.parse(await readJson(request, 10000));
    const h = await headers();
    // Only the platform's trusted client address; never use a public token as a key.
    const address =
      h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input.email.toLowerCase() + "|" + address),
    );
    const key = Array.from(new Uint8Array(digest), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    await rateLimit("auth:" + key, 8, 300);
    if (action === "signup") {
      const redirect = new URL("/auth/confirm", request.url);
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.name || input.email.split("@")[0] },
          emailRedirectTo: redirect.href,
        },
      });
      if (error)
        throw new AppError(
          "SIGNUP_FAILED",
          "Não foi possível criar a conta. Confira os dados ou tente novamente.",
          422,
        );
      return json({
        redirect: data.session ? safeReturnTo(input.return_to) : null,
        message: "Confira seu e-mail para confirmar a conta antes de entrar.",
      });
    }
    const { error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error)
      throw new AppError(
        "INVALID_CREDENTIALS",
        "E-mail ou senha inválidos, ou conta ainda não confirmada.",
        401,
      );
    return json({ redirect: safeReturnTo(input.return_to) });
  } catch (error) {
    return errorResponse(error);
  }
}
