import { X509Certificate } from "node:crypto";

const errors = [];
const env = process.env;
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
])
  if (!env[key]) errors.push(`${key} não configurada.`);
try {
  if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).protocol !== "https:")
    errors.push("Supabase deve usar HTTPS.");
} catch {
  errors.push("URL Supabase inválida.");
}
try {
  const url = new URL(env.DATABASE_URL);
  if (
    !/^(postgres|postgresql):$/.test(url.protocol) ||
    !decodeURIComponent(url.username).startsWith("orbit_backend")
  )
    errors.push("DATABASE_URL exige o papel restrito orbit_backend.");
} catch {
  errors.push("DATABASE_URL inválida.");
}
if (!["production", "development", "test"].includes(env.APP_ENV))
  errors.push("APP_ENV inválida.");
if (env.SUPABASE_DB_CA_CERT) {
  try {
    const ca = env.SUPABASE_DB_CA_CERT.replace(/\\n/g, "\n").trim();
    if (!new X509Certificate(ca).ca || ca.includes("PRIVATE KEY"))
      throw new Error();
  } catch {
    errors.push(
      "SUPABASE_DB_CA_CERT deve conter uma CA pública válida em PEM.",
    );
  }
}
const origin =
  env.APP_ORIGIN || (env.VERCEL_URL ? "https://" + env.VERCEL_URL : "");
try {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.origin !== origin
  )
    errors.push("Origem deve ser HTTPS sem caminho/credenciais.");
} catch {
  errors.push("APP_ORIGIN ou VERCEL_URL ausente/inválida.");
}
for (const [key, pair] of [
  ["GEMINI_API_KEY", "GEMINI_MODEL"],
  ["LEAD_PROVIDER_KEY", "LEAD_PROVIDER_URL"],
  ["WEBSITE_AUDIT_KEY", "WEBSITE_AUDIT_URL"],
])
  if (!!env[key] !== !!env[pair])
    errors.push(`${key} e ${pair} devem ser configurados juntos.`);
for (const key of [
  "LEAD_PROVIDER_URL",
  "WEBSITE_AUDIT_URL",
  "GEOCODING_URL",
  "OVERPASS_URL",
])
  if (env[key]) {
    try {
      const url = new URL(env[key]);
      if (url.protocol !== "https:" || url.username || url.password)
        errors.push(`${key} exige HTTPS sem credenciais na URL.`);
    } catch {
      errors.push(`${key} inválida.`);
    }
  }
for (const key of [
  "GLOBAL_SEARCH_DAILY_LIMIT",
  "GLOBAL_AI_DAILY_LIMIT",
  "GLOBAL_AUDIT_DAILY_LIMIT",
])
  if (
    env[key] &&
    (!Number.isInteger(Number(env[key])) ||
      Number(env[key]) <= 0 ||
      Number(env[key]) > 100000)
  )
    errors.push(`${key} deve ser inteiro de 1 a 100000.`);
if (
  env.SCHEDULER_ENABLED === "true" &&
  (!env.SCHEDULER_SECRET || env.SCHEDULER_SECRET.length < 32)
)
  errors.push("Scheduler exige segredo de ao menos 32 caracteres.");
if (errors.length) {
  errors.forEach((error) => process.stderr.write(error + "\n"));
  process.exit(1);
}
process.stdout.write(
  "Variáveis consistentes; valores não exibidos. Conectividade e Auth devem ser testados no runtime de destino.\n",
);
