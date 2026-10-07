import { runtime, row, rows, now, run } from "@/lib/server/db";
import type { OrgSettings } from "@/lib/domain/types";
import {
  type Context,
  errorResponse,
  json,
  AppError,
} from "@/lib/server/security";
import { processJobs } from "@/lib/server/jobs";
import { searchBusinesses } from "@/lib/server/search";
import { searchSchema } from "@/lib/server/validation";
export async function POST(request: Request) {
  try {
    const secret = runtime().WORKER_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
      throw new AppError("UNAUTHORIZED", "Worker não autorizado.", 401);
    if (runtime().SCHEDULER_ENABLED !== "true")
      throw new AppError(
        "SCHEDULER_DISABLED",
        "Execução periódica desabilitada.",
        503,
      );
    const due = await rows<{
      id: string;
      organization_id: string;
      filters_json: string;
      interval_hours: number;
    }>(
      "SELECT id,organization_id,filters_json,interval_hours FROM monitors WHERE enabled=1 AND next_run_at<=? LIMIT 3",
      now(),
    );
    let completed = 0;
    for (const monitor of due) {
      const org = await row<{
        owner_id: string;
        name: string;
        email: string;
        credits: number;
        settings_json: string;
      }>(
        "SELECT o.owner_id,u.name,u.email,o.credits,o.settings_json FROM organizations o JOIN users u ON u.id=o.owner_id WHERE o.id=?",
        monitor.organization_id,
      );
      if (!org) continue;
      const next = new Date(
        Date.now() + monitor.interval_hours * 3600000,
      ).toISOString();
      const claimed = await row<{ id: string }>(
        "UPDATE monitors SET next_run_at=? WHERE id=? AND enabled=1 AND next_run_at<=? RETURNING id",
        next,
        monitor.id,
        now(),
      );
      if (!claimed) continue;
      const c: Context = {
        userId: org.owner_id,
        orgId: monitor.organization_id,
        name: org.name,
        email: org.email,
        role: "owner",
        credits: org.credits,
        settings: JSON.parse(org.settings_json) as OrgSettings,
      };
      try {
        await searchBusinesses(
          c,
          searchSchema.parse(JSON.parse(monitor.filters_json)),
        );
        await run(
          "UPDATE monitors SET last_run_at=? WHERE id=?",
          now(),
          monitor.id,
        );
        completed++;
        await processJobs(c);
      } catch {
        await run(
          "UPDATE monitors SET next_run_at=? WHERE id=?",
          new Date(Date.now() + 3600000).toISOString(),
          monitor.id,
        );
      }
    }
    return json({ processed: completed });
  } catch (e) {
    return errorResponse(e);
  }
}
