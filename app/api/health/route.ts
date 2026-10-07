import { row } from "@/lib/server/db";
import { databaseFailureCode } from "@/lib/server/database-diagnostics";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await row("SELECT 1 AS healthy");
    return Response.json(
      { status: "ok", application: "ok", database: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "health_check_failed",
        component: "database",
        code: databaseFailureCode(error),
      }),
    );
    return Response.json(
      { status: "unavailable", application: "ok", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
