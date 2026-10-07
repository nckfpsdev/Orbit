import assert from "node:assert/strict";
import { test } from "node:test";
import { providerUserAgent } from "../lib/providers/identity";

test("identificação usa a origem real configurada e a versão da aplicação", () => {
  assert.equal(
    providerUserAgent("https://business.example.org/app"),
    "OrbitLocal/0.1.0 (+https://business.example.org)",
  );
});
test("contato configurado pode identificar o operador sem inventar domínio", () => {
  assert.equal(
    providerUserAgent(undefined, "operator@example.org"),
    "OrbitLocal/0.1.0 (operator@example.org)",
  );
});
test("nenhuma fonte pública usa User-Agent genérico se a identificação estiver ausente", () => {
  assert.throws(() => providerUserAgent(), { code: "PROVIDER_CONFIGURATION" });
});
test("identificação rejeita origens inseguras, credenciais e header injection", () => {
  for (const origin of [
    "http://localhost",
    "https://127.0.0.1",
    "https://user:secret@example.org",
  ])
    assert.throws(() => providerUserAgent(origin), {
      code: "PROVIDER_CONFIGURATION",
    });
  for (const contact of [
    "operator@example.org\r\nX-Test: true",
    "local development",
    "a".repeat(260) + "@example.org",
  ])
    assert.throws(
      () => providerUserAgent("https://business.example.org", contact),
      { code: "PROVIDER_CONFIGURATION" },
    );
});
