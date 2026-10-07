import { row } from "@/lib/server/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await row("SELECT 1 AS healthy");
    return Response.json(
      { status: "ok", application: "ok", database: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error(
      JSON.stringify({ event: "health_check_failed", component: "database" }),
    );
    return Response.json(
      { status: "unavailable", application: "ok", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
