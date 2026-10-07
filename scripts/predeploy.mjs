import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
if (readdirSync("public").some((name) => name.startsWith("__audit"))) {
  process.stderr.write(
    "Remova os arquivos temporários de auditoria antes do build.\n",
  );
  process.exit(1);
}
const checks = [
  "lint",
  "typecheck",
  "test",
  "test:database",
  "build",
];
for (const name of checks) {
  process.stdout.write(`\n[predeploy] ${name}\n`);
  const result = spawnSync("pnpm", ["run", name], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    process.stderr.write(`Não foi possível executar ${name}.\n`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const audit = spawnSync("pnpm", ["audit", "--prod", "--audit-level", "high"], {
  stdio: "inherit",
  env: process.env,
});
if (audit.status !== 0) process.exit(audit.status ?? 1);
process.stdout.write(
  "\nVerificações automáticas concluídas. A aprovação exige também QA de navegador e configuração operacional. Nenhum deploy foi executado.\n",
);
