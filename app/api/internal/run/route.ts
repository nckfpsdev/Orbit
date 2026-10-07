import { runtime, row, rows, now, run } from "@/lib/server/db";
import { context, errorResponse, json, AppError, requireOwner } from "@/lib/server/security";
import { processJobs } from "@/lib/server/jobs";
import { searchBusinesses } from "@/lib/server/search";
import { searchSchema } from "@/lib/server/validation";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const secret = runtime().SCHEDULER_SECRET;
    if (!secret || request.headers.get("x-scheduler-secret") !== secret)
      throw new AppError("UNAUTHORIZED", "Agendador não autorizado.", 401);
    if (runtime().SCHEDULER_ENABLED !== "true") throw new AppError("SCHEDULER_DISABLED", "Execução periódica desabilitada.", 503);
    // The scheduler supplies a Supabase access token belonging to this workspace.
    // No global role or tenant bypass is used.
    const c = await context();
    requireOwner(c);
    const due = await rows<{ id: string; filters_json: string; interval_hours: number }>(
      "SELECT id,filters_json,interval_hours FROM monitors WHERE organization_id=? AND enabled=true AND next_run_at<=? LIMIT 3", c.orgId, now());
    let completed = 0;
    for (const monitor of due) {
      const claimed = await row<{ id: string }>(
        "UPDATE monitors SET next_run_at=? WHERE id=? AND organization_id=? AND enabled=true AND next_run_at<=? RETURNING id",
        new Date(Date.now()+monitor.interval_hours*3600000).toISOString(), monitor.id, c.orgId, now());
      if (!claimed) continue;
      try {
        await searchBusinesses(c, searchSchema.parse(JSON.parse(monitor.filters_json)));
        await run("UPDATE monitors SET last_run_at=? WHERE id=? AND organization_id=?", now(), monitor.id, c.orgId);
        completed++;
      } catch {
        await run("UPDATE monitors SET next_run_at=? WHERE id=? AND organization_id=?", new Date(Date.now()+3600000).toISOString(), monitor.id, c.orgId);
      }
    }
    await processJobs(c);
    return json({ processed: completed });
  } catch (error) { return errorResponse(error); }
}
