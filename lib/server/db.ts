import { env } from "cloudflare:workers";
export interface RuntimeEnv {
  DB: D1Database;
  APP_ENV?: string;
  GLOBAL_SEARCH_DAILY_LIMIT?: string;
  GLOBAL_AI_DAILY_LIMIT?: string;
  GLOBAL_AUDIT_DAILY_LIMIT?: string;
  LEAD_PROVIDER_URL?: string;
  LEAD_PROVIDER_KEY?: string;
  GEOCODING_URL?: string;
  NOMINATIM_CONTACT?: string;
  OVERPASS_URL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  WEBSITE_AUDIT_URL?: string;
  WEBSITE_AUDIT_KEY?: string;
  WORKER_SECRET?: string;
  SCHEDULER_ENABLED?: string;
  APP_ORIGIN?: string;
  ADMIN_EMAILS?: string;
}
export function runtime(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}
export function database(): D1Database {
  const db = runtime().DB;
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db;
}
export async function row<T>(
  sql: string,
  ...args: unknown[]
): Promise<T | null> {
  return database()
    .prepare(sql)
    .bind(...args)
    .first<T>();
}
export async function rows<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  const r = await database()
    .prepare(sql)
    .bind(...args)
    .all<T>();
  return r.results;
}
export async function run(sql: string, ...args: unknown[]) {
  return database()
    .prepare(sql)
    .bind(...args)
    .run();
}
export async function batch(statements: { sql: string; args: unknown[] }[]) {
  if (!statements.length) return [];
  return database().batch(
    statements.map((s) =>
      database()
        .prepare(s.sql)
        .bind(...s.args),
    ),
  );
}
export function id(prefix = "id") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
export function now() {
  return new Date().toISOString();
}
