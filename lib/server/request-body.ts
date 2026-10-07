import { AppError } from "@/lib/domain/errors";

export async function boundedText(
  response: Request | Response,
  maxBytes: number,
) {
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes)
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      "Solicitação ou resposta muito grande.",
      413,
    );
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new AppError(
          "PAYLOAD_TOO_LARGE",
          "Solicitação ou resposta muito grande.",
          413,
        );
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
export async function readJson(request: Request) {
  const text = await boundedText(request, 80000);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("INVALID_JSON", "Dados JSON inválidos.", 400);
  }
}
