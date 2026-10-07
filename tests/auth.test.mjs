import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo } from "../lib/supabase/redirect.ts";
test("authentication redirects remain on application routes", () => {
  for (const value of [
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/api/auth/logout",
    "/login",
    null,
  ])
    assert.equal(safeReturnTo(value), "/");
  assert.equal(safeReturnTo("/crm?tag=Cl%C3%ADnica"), "/crm?tag=Cl%C3%ADnica");
});
