import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { bindQuery } from "../lib/server/postgres-query.ts";
import {
  RESERVE_CREDITS,
  REFUND_CREDITS,
  UPDATE_WEBSITE_VERSION,
} from "../lib/server/atomic-queries.ts";
const migrations = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .sort();
async function setup() {
  const db = await PGlite.create();
  // Minimal Auth catalog for PostgreSQL tests only. Real ownership is independently
  // tested by the Supabase connector; this does not simulate an accepted login.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id));
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
  `);
  for (const migration of migrations)
    await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
  return db;
}
async function query(db, sql, values = []) {
  const bound = bindQuery(sql, values);
  return db.query(bound.text, bound.values);
}
async function seed(db) {
  await db.exec(`
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('00000000-0000-4000-8000-000000000101','migration-a@orbit.invalid',now());
    INSERT INTO auth.sessions(id,user_id) VALUES('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000101');
    INSERT INTO public.users(id,auth_user_id,email,name) VALUES('unit_user','00000000-0000-4000-8000-000000000101','migration-a@orbit.invalid','Test');
    INSERT INTO public.organizations(id,owner_id,name,credits,settings_json) VALUES('unit_org','unit_user','Test',100,'{}');
    INSERT INTO public.memberships(id,organization_id,user_id,role) VALUES('unit_member','unit_org','unit_user','owner');
    INSERT INTO public.businesses(id,organization_id,business_name,category,source,website_status,lead_score,data_json)
     VALUES('unit_business','unit_org','Clínica','Clínicas','osm','not_identified',91,'{}');
    INSERT INTO public.generated_websites(id,organization_id,business_id,business_name,slug,status,content_json,engine)
     VALUES('unit_site','unit_org','unit_business','Clínica','unit-clinica','draft','{}','local');
    BEGIN;
    SET LOCAL ROLE orbit_backend;
    SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","session_id":"00000000-0000-4000-8000-000000000111"}',true);
  `);
}
test("all versioned migrations apply from an empty PostgreSQL database with validated RLS and foreign keys", async () => {
  const db = await setup();
  try {
    const schema = await db.query(
      "SELECT count(*)::int AS total,count(*) FILTER(WHERE relrowsecurity)::int AS protected FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'",
    );
    assert.deepEqual(schema.rows[0], { total: 29, protected: 29 });
    const fk = await db.query(
      "SELECT count(*)::int AS total FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' AND convalidated",
    );
    assert.equal(fk.rows[0].total, 48);
    assert.equal(
      (
        await db.query(
          "SELECT rolbypassrls FROM pg_roles WHERE rolname='orbit_backend'",
        )
      ).rows[0].rolbypassrls,
      false,
    );
  } finally {
    await db.close();
  }
});
test("the remote connector authorization fixture also passes on a clean schema and leaves no data", async () => {
  const db = await setup();
  try {
    const results = await db.exec(
      readFileSync("tests/sql/rls-validation.sql", "utf8"),
    );
    assert.deepEqual(results.at(-1).rows[0], {
      authorization_validation: "PASS",
      residual_fixture_rows: 0,
    });
  } finally {
    await db.close();
  }
});
test("credit debit is atomic, insufficient balance creates no ledger, and repeated refunds are idempotent", async () => {
  const db = await setup();
  try {
    await seed(db);
    const date = "2026-10-07T00:00:00Z";
    assert.equal(
      (
        await query(db, RESERVE_CREDITS, [
          10,
          date,
          "unit_org",
          10,
          "credit_1",
          -10,
          "website",
          null,
          date,
        ])
      ).rows[0].credits,
      90,
    );
    assert.equal(
      (
        await query(db, RESERVE_CREDITS, [
          1000,
          date,
          "unit_org",
          1000,
          "credit_2",
          -1000,
          "website",
          null,
          date,
        ])
      ).rows.length,
      0,
    );
    const refund = [
      "credit_1_refund",
      "unit_org",
      10,
      "website_refund",
      "credit_1",
      date,
    ];
    await query(db, REFUND_CREDITS, refund);
    await query(db, REFUND_CREDITS, refund);
    assert.equal(
      (await db.query("SELECT credits FROM organizations WHERE id='unit_org'"))
        .rows[0].credits,
      100,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM credit_transactions"))
        .rows[0].n,
      2,
    );
    await db.exec("ROLLBACK");
  } finally {
    await db.close();
  }
});
test("optimistic site version update creates exactly one version and rejects a stale concurrent edit", async () => {
  const db = await setup();
  try {
    await seed(db);
    const args = [
      '{"business_name":"Clínica"}',
      "2026-10-07T00:00:00Z",
      "unit_site",
      "unit_org",
      1,
      "version_2",
      "Revisão",
      "2026-10-07T00:00:00Z",
    ];
    assert.equal(
      (await query(db, UPDATE_WEBSITE_VERSION, args)).rows.length,
      1,
    );
    args[5] = "stale_version";
    assert.equal(
      (await query(db, UPDATE_WEBSITE_VERSION, args)).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "SELECT version FROM generated_websites WHERE id='unit_site'",
        )
      ).rows[0].version,
      2,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM website_versions"))
        .rows[0].n,
      1,
    );
    await db.exec("ROLLBACK");
  } finally {
    await db.close();
  }
});
