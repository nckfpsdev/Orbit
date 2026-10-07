export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  const url = new URL(value, "https://orbit.invalid");
  if (url.origin !== "https://orbit.invalid" || url.pathname.startsWith("/api/") || url.pathname === "/login") return "/";
  return url.pathname + url.search + url.hash;
}
