/** Preliminary URL policy; the configured audit proxy must also revalidate DNS and redirects. */
export function isPublicHostname(host: string): boolean {
  const h = host
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".example") ||
    h === "metadata.google.internal" ||
    h.includes(":") ||
    /^\d+$/.test(h)
  )
    return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const p = h.split(".").map(Number);
    if (
      p.some((n) => n > 255) ||
      p[0] === 0 ||
      p[0] === 10 ||
      p[0] === 127 ||
      p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 &&
        (p[1] === 168 || p[1] === 0 || (p[1] === 88 && p[2] === 99))) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      (p[0] === 198 && [18, 19, 51].includes(p[1])) ||
      (p[0] === 203 && p[1] === 0 && p[2] === 113)
    )
      return false;
  }
  return h.includes(".");
}

export function safeProviderEndpoint(value: string): URL | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      isPublicHostname(u.hostname) &&
      (!u.port || u.port === "443")
      ? u
      : null;
  } catch {
    return null;
  }
}
