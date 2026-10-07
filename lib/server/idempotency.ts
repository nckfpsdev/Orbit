import { row, run, now } from "./db";
import { AppError, type Context } from "./security";

/** A durable operation key survives refresh, retries and concurrent serverless instances. */
export async function idempotent(
  c: Context,
  request: Request,
  input: unknown,
  execute: () => Promise<Response>,
) {
  const key = request.headers.get("Idempotency-Key");
  if (!key) return execute();
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw new AppError(
      "INVALID_OPERATION_KEY",
      "Identificador da operação inválido.",
      422,
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify({ path: new URL(request.url).pathname, input }),
    ),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
  const claimed = await row<{ operation_key: string }>(
    "INSERT INTO api_operations (organization_id,operation_key,fingerprint,status,created_at) VALUES (?,?,?,'running',?) ON CONFLICT(organization_id,operation_key) DO NOTHING RETURNING operation_key",
    c.orgId,
    key,
    fingerprint,
    now(),
  );
  if (!claimed) {
    const previous = await row<{
      fingerprint: string;
      status: string;
      response_json: string | null;
      http_status: number | null;
    }>(
      "SELECT fingerprint,status,response_json,http_status FROM api_operations WHERE organization_id=? AND operation_key=?",
      c.orgId,
      key,
    );
    if (!previous || previous.fingerprint !== fingerprint)
      throw new AppError(
        "OPERATION_CONFLICT",
        "Este identificador já foi usado para outra operação.",
        409,
      );
    if (previous.status === "completed" && previous.response_json)
      return new Response(previous.response_json, {
        status: previous.http_status ?? 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "Idempotency-Replayed": "true",
        },
      });
    // An expired in-flight request is never repeated automatically: it may have committed.
    throw new AppError(
      "OPERATION_PENDING",
      "Esta operação já está em processamento. Confira o resultado antes de tentar novamente.",
      409,
    );
  }
  try {
    const response = await execute();
    await run(
      "UPDATE api_operations SET status='completed',response_json=?,http_status=? WHERE organization_id=? AND operation_key=?",
      await response.clone().text(),
      response.status,
      c.orgId,
      key,
    );
    return response;
  } catch (error) {
    // Keep a failed key blocked when the commit outcome is unknown.
    await run(
      "UPDATE api_operations SET status='failed' WHERE organization_id=? AND operation_key=?",
      c.orgId,
      key,
    );
    throw error;
  }
}
