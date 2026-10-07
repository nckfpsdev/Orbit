import { X509Certificate } from "node:crypto";
import type { ConnectionOptions } from "node:tls";

/** Keep certificate and hostname verification enabled for the pooler. */
export function databaseTlsOptions(certificate?: string): ConnectionOptions {
  if (!certificate) return { rejectUnauthorized: true };
  const ca = certificate.replace(/\\n/g, "\n").trim();
  try {
    const root = new X509Certificate(ca);
    if (!root.ca || ca.includes("PRIVATE KEY")) throw new Error();
    return { ca, rejectUnauthorized: true };
  } catch {
    throw new Error("DATABASE_CA_INVALID");
  }
}
