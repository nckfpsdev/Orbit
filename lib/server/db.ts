import "server-only";
import postgres from "postgres";
import { getIdentity } from "@/lib/supabase/auth";
import { bindQuery, normalizeDbRow } from "./postgres-query";

export interface RuntimeEnv extends NodeJS.ProcessEnv {
  DATABASE_URL?: string;
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
  SCHEDULER_SECRET?: string;
  SCHEDULER_ENABLED?: string;
  APP_ORIGIN?: string;
  ADMIN_EMAILS?: string;
}
export function runtime(): RuntimeEnv {
  return {
    ...process.env,
    APP_ORIGIN:
      process.env.APP_ORIGIN ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  };
}
let connection: ReturnType<typeof postgres> | undefined;
export function database() {
  if (connection) return connection;
  const url = runtime().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  const parsed = new URL(url);
  if (
    !/^(postgres|postgresql):$/.test(parsed.protocol) ||
    !decodeURIComponent(parsed.username).startsWith("orbit_backend")
  )
    throw new Error("DATABASE_ROLE_INVALID");
  connection = postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: true },
    connection: { application_name: "orbit", statement_timeout: 20000 },
    types: {
      number: {
        to: 1700,
        from: [20, 1700],
        serialize: (value: number) => String(value),
        parse: (value: string) => Number(value),
      },
    },
    onnotice: () => {},
  });
  return connection;
}
interface Statement {
  sql: string;
  args: unknown[];
}
export interface QueryResult {
  results: Record<string, unknown>[];
  meta: { changes: number };
}
export async function batch(statements: Statement[]): Promise<QueryResult[]> {
  if (!statements.length) return [];
  const identity = await getIdentity();
  const claims = JSON.stringify(identity?.claims ?? {});
  return database().begin(async (transaction) => {
    // Claims are scoped to a real transaction; pooled connections never retain identity.
    await transaction`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    const results: QueryResult[] = [];
    for (const statement of statements) {
      const bound = bindQuery(statement.sql, statement.args);
      const result = await transaction.unsafe(
        bound.text,
        bound.values as postgres.ParameterOrJSON<never>[],
      );
      results.push({
        results: result.map(normalizeDbRow),
        meta: { changes: result.count },
      });
    }
    return results;
  }) as Promise<QueryResult[]>;
}
export async function rows<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  return (await batch([{ sql, args }]))[0].results as T[];
}
export async function row<T>(
  sql: string,
  ...args: unknown[]
): Promise<T | null> {
  return (await rows<T>(sql, ...args))[0] ?? null;
}
export async function run(sql: string, ...args: unknown[]) {
  return (await batch([{ sql, args }]))[0];
}
export function id(prefix = "id") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
export function now() {
  return new Date().toISOString();
}
