const allowedCodes = new Set([
  "DATABASE_URL_NOT_CONFIGURED",
  "DATABASE_ROLE_INVALID",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "CONNECT_TIMEOUT",
  "28P01",
  "28000",
  "42501",
  "3D000",
  "3F000",
  "42P01",
  "42703",
  "08001",
  "08003",
  "08006",
  "08P01",
  "53300",
  "53400",
  "57P01",
  "57014",
]);

/** Log a diagnostic code, never connection strings, SQL, or error messages. */
export function databaseFailureCode(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 3; depth++) {
    if (!current || typeof current !== "object") break;
    if (
      "code" in current &&
      typeof current.code === "string" &&
      allowedCodes.has(current.code)
    )
      return current.code;
    if (current instanceof Error && allowedCodes.has(current.message))
      return current.message;
    current = "cause" in current ? current.cause : undefined;
  }
  return "UNKNOWN_DATABASE_ERROR";
}
