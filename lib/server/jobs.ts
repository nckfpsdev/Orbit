import { STAGES } from "@/lib/domain/constants";
import type { SearchFilters } from "@/lib/domain/types";
import { row, rows, run, id, now, runtime } from "./db";
import { type Context, AppError, audit } from "./security";
import { getBusiness, getBusinessesByIds, saveLead } from "./store";
import { enrichBusiness } from "./analysis";
import { searchBusinesses } from "./search";
export async function batchLeads(
  c: Context,
  input: { ids: string[]; action: string; tag?: string; stage?: string },
) {
  input.ids = [...new Set(input.ids)];
  await getBusinessesByIds(c, input.ids);
  if (input.action === "analyze") {
    const jobs = [];
    for (const businessId of input.ids) {
      const jobId = id("job");
      await run(
        "INSERT INTO jobs (id,organization_id,kind,payload_json,status,attempts,run_at,created_at,updated_at) VALUES (?,?,?,?,'pending',0,?,?,?)",
        jobId,
        c.orgId,
        "enrich",
        JSON.stringify({ business_id: businessId }),
        now(),
        now(),
        now(),
      );
      jobs.push(jobId);
    }
    return { queued: jobs.length, job_ids: jobs };
  }
  if (input.action === "tag" && !input.tag)
    throw new AppError("VALIDATION_ERROR", "Informe uma tag.", 422);
  if (
    input.action === "move" &&
    (!input.stage || !STAGES.includes(input.stage))
  )
    throw new AppError("VALIDATION_ERROR", "Escolha um estágio válido.", 422);
  for (const businessId of input.ids) {
    const b = await getBusiness(c, businessId);
    await saveLead(c, {
      business_id: businessId,
      ...(input.action === "move" ? { stage: input.stage } : {}),
      ...(input.action === "tag"
        ? { tags: [...new Set([...b.tags, input.tag!])].slice(0, 15) }
        : {}),
    });
  }
  return { updated: input.ids.length };
}
export async function processJobs(c: Context) {
  const candidates = await rows<{
    id: string;
    payload_json: string;
    kind: string;
    attempts: number;
  }>(
    "SELECT * FROM jobs WHERE organization_id=? AND status IN ('pending','running') AND run_at<=? AND (locked_until IS NULL OR locked_until<?) ORDER BY created_at LIMIT 3",
    c.orgId,
    now(),
    now(),
  );
  for (const job of candidates) {
    const claimed = await row<{ id: string }>(
      "UPDATE jobs SET status='running',locked_until=?,attempts=attempts+1,updated_at=? WHERE id=? AND organization_id=? AND status IN ('pending','running') AND run_at<=? AND (locked_until IS NULL OR locked_until<?) RETURNING id",
      new Date(Date.now() + 120000).toISOString(),
      now(),
      job.id,
      c.orgId,
      now(),
      now(),
    );
    if (!claimed) continue;
    try {
      const payload = JSON.parse(job.payload_json);
      const result =
        job.kind === "search"
          ? await searchBusinesses(c, payload.filters)
          : await enrichBusiness(c, payload.business_id);
      await run(
        "UPDATE jobs SET status='completed',result_json=?,locked_until=NULL,updated_at=? WHERE id=? AND organization_id=?",
        JSON.stringify(result),
        now(),
        job.id,
        c.orgId,
      );
    } catch (e) {
      const code = e instanceof AppError ? e.code : "SERVICE_UNAVAILABLE";
      const retry =
        job.attempts < 2 &&
        [
          "PROVIDER_UNAVAILABLE",
          "PROVIDER_RATE_LIMIT",
          "SERVICE_UNAVAILABLE",
        ].includes(code);
      await run(
        "UPDATE jobs SET status=?,error_code=?,locked_until=NULL,run_at=?,updated_at=? WHERE id=? AND organization_id=?",
        retry ? "pending" : "failed",
        code,
        new Date(Date.now() + 60000).toISOString(),
        now(),
        job.id,
        c.orgId,
      );
    }
  }
  return rows(
    "SELECT id,kind,status,error_code,created_at FROM jobs WHERE organization_id=? ORDER BY created_at DESC LIMIT 50",
    c.orgId,
  );
}
export async function createMonitor(
  c: Context,
  input: {
    name: string;
    filters: SearchFilters;
    interval_hours: number;
    enabled: boolean;
  },
) {
  if (
    input.enabled &&
    (runtime().SCHEDULER_ENABLED !== "true" || !runtime().WORKER_SECRET)
  )
    throw new AppError(
      "SCHEDULER_NOT_CONFIGURED",
      "O monitor foi preparado, mas a execução periódica depende de um agendador conectado. Salve como pausado ou execute manualmente.",
      503,
    );
  const monitorId = id("monitor");
  await run(
    "INSERT INTO monitors (id,organization_id,name,filters_json,enabled,interval_hours,next_run_at,created_at) VALUES (?,?,?,?,?,?,?,?)",
    monitorId,
    c.orgId,
    input.name,
    JSON.stringify(input.filters),
    Number(input.enabled),
    input.interval_hours,
    new Date(Date.now() + input.interval_hours * 3600000).toISOString(),
    now(),
  );
  await audit(
    c,
    "monitor.create",
    monitorId,
    input.enabled ? "Ativado" : "Pausado",
  );
  return { id: monitorId, ...input };
}
