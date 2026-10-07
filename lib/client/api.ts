export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
const inFlight = new Map<
  string,
  { promise: Promise<unknown>; signal?: AbortSignal }
>();
const operationKeys = new Map<string, string>();
async function send<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  const identity = `${path}:${serialized}`;
  const key =
    serialized === undefined
      ? undefined
      : (operationKeys.get(identity) ??
        (typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "op_" +
            Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
              v.toString(16).padStart(2, "0"),
            ).join("")));
  if (key) operationKeys.set(identity, key);
  const timeout = AbortSignal.timeout(75000);
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: key
        ? { "Content-Type": "application/json", "Idempotency-Key": key }
        : {},
      body: serialized,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      timeout.aborted
        ? "A solicitação demorou além do esperado. Confira se o resultado foi salvo antes de tentar novamente."
        : "Não foi possível conectar. Verifique sua conexão e tente novamente.",
      timeout.aborted ? "TIMEOUT" : "NETWORK_ERROR",
      0,
    );
  }
  let result: { data: T; error?: { message: string; code: string } };
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      response.status === 401
        ? "Sua sessão expirou. Entre novamente."
        : "O serviço retornou uma resposta inesperada. Tente novamente.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  if (!response.ok) {
    if (
      !["SERVICE_UNAVAILABLE", "OPERATION_PENDING"].includes(
        result.error?.code ?? "",
      )
    )
      operationKeys.delete(identity);
    throw new ApiError(
      result.error?.message ?? "Não foi possível concluir a ação.",
      result.error?.code ?? "UNKNOWN",
      response.status,
    );
  }
  operationKeys.delete(identity);
  return result.data;
}
export function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (body === undefined) return send<T>(path, body, signal);
  const identity = `${path}:${JSON.stringify(body)}`;
  const existing = inFlight.get(identity);
  if (existing && !existing.signal?.aborted)
    return existing.promise as Promise<T>;
  const promise = send<T>(path, body, signal).finally(() => {
    if (inFlight.get(identity)?.promise === promise) inFlight.delete(identity);
  });
  inFlight.set(identity, { promise, signal });
  return promise;
}
export function errorMessage(e: unknown) {
  return e instanceof ApiError
    ? e.message
    : e instanceof DOMException && e.name === "AbortError"
      ? "Solicitação cancelada."
      : "Não foi possível concluir. Tente novamente.";
}
export function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data indisponível";
}
export function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
