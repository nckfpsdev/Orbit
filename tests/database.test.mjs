import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const migrations = readdirSync("drizzle")
  .filter((f) => f.endsWith(".sql"))
  .sort();
function apply(db, files = migrations) {
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of files)
    db.exec(
      readFileSync(`drizzle/${file}`, "utf8").replaceAll(
        "--> statement-breakpoint",
        "",
      ),
    );
}
test("migrations from an empty database establish all tables and foreign keys", () => {
  const db = new DatabaseSync(":memory:");
  try {
    apply(db);
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get().n,
      29,
    );
    assert.equal(
      db.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.ok(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name='idx_search_results_position'",
        )
        .get(),
    );
  } finally {
    db.close();
  }
});
test("forward migration preserves an existing organization and credit ledger", () => {
  const db = new DatabaseSync(":memory:");
  try {
    apply(db, [migrations[0]]);
    db.exec(
      "INSERT INTO users VALUES('test-user','fixture@orbit.test','Fixture','2026-10-06','2026-10-06'); INSERT INTO organizations VALUES('test-org','test-user','Fixture',70,'{}',1,'2026-10-06','2026-10-06'); INSERT INTO credit_transactions (id,organization_id,amount,action,created_at) VALUES('test-credit','test-org',70,'fixture','2026-10-06');",
    );
    apply(db, migrations.slice(1));
    assert.equal(
      db.prepare("SELECT credits FROM organizations WHERE id='test-org'").get()
        .credits,
      70,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM credit_transactions").get().n,
      1,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
test("isolated SQLite backup restores schema and ledger without altering the source", () => {
  const dir = mkdtempSync(join(tmpdir(), "orbit-restore-"));
  const source = new DatabaseSync(join(dir, "source.sqlite"));
  let restored;
  try {
    apply(source);
    source.exec(
      "INSERT INTO users VALUES('fixture','fixture@orbit.test','Fixture','2026-10-06','2026-10-06')",
    );
    const path = join(dir, "backup.sqlite");
    source.prepare("VACUUM INTO ?").run(path);
    restored = new DatabaseSync(path);
    assert.deepEqual(
      restored.prepare("SELECT * FROM users").all(),
      source.prepare("SELECT * FROM users").all(),
    );
    assert.equal(
      restored.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    assert.deepEqual(restored.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    restored?.close();
    source.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
