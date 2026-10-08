import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bindQuery,
  normalizeDbRow,
  databaseJsonType,
} from "../lib/server/postgres-query.ts";
import postgres from "postgres";

test("parameters preserve quoted SQL, comments and dollar bodies", () => {
  const sql = `SELECT '?' AS "?", $$?$$, $body$?$body$, ? /* ? /* ? */ */ -- ?\nWHERE x=?`;
  assert.equal(
    bindQuery(sql, ["O'Reilly", 2]).text,
    sql.replace(", ? /*", ", $1 /*").replace("x=?", "x=$2"),
  );
  assert.deepEqual(bindQuery("SELECT ?", ["'; DROP TABLE users; --"]).values, [
    "'; DROP TABLE users; --",
  ]);
});
test("invalid parameter counts and unterminated SQL fail closed", () => {
  for (const [sql, args] of [
    ["SELECT ?", []],
    ["SELECT 1", [1]],
    ["SELECT 'oops ?", [1]],
  ])
    assert.throws(() => bindQuery(sql, args), /INVALID_SQL_PARAMETERS/);
});
test("JSONB and UTC timestamps preserve API contracts", () => {
  assert.deepEqual(
    normalizeDbRow({
      data_json: { name: "Clínica" },
      tags_json: [],
      created_at: new Date("2026-10-07T00:00:00Z"),
      enabled: false,
      notes: null,
    }),
    {
      data_json: '{"name":"Clínica"}',
      tags_json: "[]",
      created_at: "2026-10-07T00:00:00.000Z",
      enabled: false,
      notes: null,
    },
  );
});

test("the real driver keeps serialized JSON arrays and objects as structured JSON", async () => {
  const sql = postgres({ prepare: false, types: { json: databaseJsonType } });
  try {
    for (const oid of [114, 3802]) {
      for (const value of [
        [],
        ["Clínica", "O'Reilly"],
        { name: "São Paulo", active: true },
      ]) {
        const serialized = sql.options.serializers[oid](JSON.stringify(value));
        assert.deepEqual(JSON.parse(serialized), value);
        assert.deepEqual(sql.options.parsers[oid](serialized), value);
      }
    }
    assert.throws(() => databaseJsonType.serialize("invalid JSON"));
    assert.deepEqual(JSON.parse(databaseJsonType.serialize({ count: 2 })), {
      count: 2,
    });
    // Rows written before this fix remain readable through the existing contract.
    assert.equal(
      normalizeDbRow({ data_json: '{"name":"Clínica"}' }).data_json,
      '{"name":"Clínica"}',
    );
  } finally {
    await sql.end({ timeout: 0 });
  }
});
