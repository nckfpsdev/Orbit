const errors = [];
const env = process.env;
if (env.APP_ENV !== "production")
  errors.push("APP_ENV deve ser production no Site de produção.");
try {
  const url = new URL(env.APP_ORIGIN);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.origin !== env.APP_ORIGIN
  )
    errors.push(
      "APP_ORIGIN deve ser uma origem HTTPS, sem caminho ou credenciais.",
    );
} catch {
  errors.push("APP_ORIGIN ausente ou inválida.");
}
for (const [key, url] of [
  ["GEMINI_API_KEY", "GEMINI_MODEL"],
  ["LEAD_PROVIDER_KEY", "LEAD_PROVIDER_URL"],
  ["WEBSITE_AUDIT_KEY", "WEBSITE_AUDIT_URL"],
])
  if (!!env[key] !== !!env[url])
    errors.push(`${key} e ${url} precisam ser configurados juntos.`);
for (const key of [
  "LEAD_PROVIDER_URL",
  "WEBSITE_AUDIT_URL",
  "GEOCODING_URL",
  "OVERPASS_URL",
]) {
  if (env[key]) {
    try {
      const url = new URL(env[key]);
      if (url.protocol !== "https:" || url.username || url.password)
        errors.push(`${key} deve usar HTTPS sem credenciais na URL.`);
    } catch {
      errors.push(`${key} inválida.`);
    }
  }
}
for (const key of [
  "GLOBAL_SEARCH_DAILY_LIMIT",
  "GLOBAL_AI_DAILY_LIMIT",
  "GLOBAL_AUDIT_DAILY_LIMIT",
]) {
  if (
    env[key] &&
    (!Number.isInteger(Number(env[key])) ||
      Number(env[key]) <= 0 ||
      Number(env[key]) > 100000)
  )
    errors.push(`${key} deve ser inteiro de 1 a 100000.`);
}
if (
  env.SCHEDULER_ENABLED === "true" &&
  (!env.WORKER_SECRET || env.WORKER_SECRET.length < 32)
)
  errors.push("Scheduler exige WORKER_SECRET com pelo menos 32 caracteres.");
if (errors.length) {
  for (const error of errors) process.stderr.write(error + "\n");
  process.exit(1);
}
process.stdout.write(
  "Configuração consistente. Nenhum valor secreto foi exibido. Credenciais e binding DB devem ser validados no runtime de destino.\n",
);
