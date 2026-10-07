import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseFailureCode } from "../lib/server/database-diagnostics";

test("database diagnostics retain actionable codes without secret messages", () => {
  const error = Object.assign(new Error("postgres://private-credentials"), {
    code: "SELF_SIGNED_CERT_IN_CHAIN",
  });
  assert.equal(databaseFailureCode(error), "SELF_SIGNED_CERT_IN_CHAIN");
  assert.equal(
    databaseFailureCode(new Error("request failed", { cause: { code: "28P01" } })),
    "28P01",
  );
  assert.equal(
    databaseFailureCode(new Error("DATABASE_URL_NOT_CONFIGURED")),
    "DATABASE_URL_NOT_CONFIGURED",
  );
});

test("unknown fields, messages and cycles cannot leak into diagnostic logs", () => {
  const cycle: { cause?: unknown } = {};
  cycle.cause = cycle;
  for (const error of [
    new Error("postgres://user:private-password@database"),
    { code: "private-token", detail: "private SQL" },
    cycle,
    null,
  ])
    assert.equal(databaseFailureCode(error), "UNKNOWN_DATABASE_ERROR");
});
