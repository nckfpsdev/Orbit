import { readJson } from "@/lib/server/request-body";
import { idempotent } from "@/lib/server/idempotency";
import { requireDemo } from "@/lib/server/environment";
import { z } from "zod";
import {
  context,
  checkMutation,
  rateLimit,
  json,
  errorResponse,
  AppError,
  requireAdmin,
  requireOwner,
  requireCreditManager,
  audit,
} from "@/lib/server/security";
import {
  boot,
  initialize,
  getBusiness,
  getBusinessPage,
  saveLead,
  websiteRecords,
  scriptRecords,
  proposalRecords,
} from "@/lib/server/store";
import { searchBusinesses, getSearch } from "@/lib/server/search";
import { enrichBusiness, analyzeWebsite } from "@/lib/server/analysis";
import {
  createWebsite,
  getWebsite,
  updateWebsite,
  editWebsiteAI,
  publishWebsite,
  createScript,
  createProposal,
} from "@/lib/server/generation";
import { batchLeads, processJobs, createMonitor } from "@/lib/server/jobs";
import {
  searchSchema,
  leadSchema,
  batchSchema,
  generateSchema,
  contentSchema,
  scriptSchema,
  proposalSchema,
  settingsSchema,
} from "@/lib/server/validation";
import { id, now, run, rows, row } from "@/lib/server/db";
export const dynamic = "force-dynamic";
interface Params {
  params: Promise<{ segments: string[] }>;
}
export async function GET(request: Request, { params }: Params) {
  try {
    const c = await context();
    await rateLimit(`${c.orgId}:read`, 150, 60);
    const { segments: s } = await params;
    if (s[0] === "bootstrap") return json(await boot(c));
    if (s[0] === "search" && s[1]) {
      const query = new URL(request.url).searchParams;
      const pagination = z
        .object({
          page: z.coerce.number().int().min(1).max(10000),
          page_size: z.coerce.number().int().min(1).max(250),
        })
        .parse({
          page: query.get("page") ?? 1,
          page_size: query.get("page_size") ?? 250,
        });
      return json(
        await getSearch(c, s[1], pagination.page, pagination.page_size),
      );
    }
    if (s[0] === "leads" && !s[1]) {
      const q = new URL(request.url).searchParams;
      const data = z
        .object({
          page: z.coerce.number().int().min(1).max(100000),
          page_size: z.coerce.number().int().min(1).max(100),
          saved: z.enum(["true", "false"]),
          query: z.string().max(180),
          list_id: z.string().max(120),
        })
        .parse({
          page: q.get("page") ?? 1,
          page_size: q.get("page_size") ?? 50,
          saved: q.get("saved") ?? "false",
          query: q.get("q") ?? "",
          list_id: q.get("list_id") ?? "",
        });
      return json(
        await getBusinessPage(
          c,
          data.page,
          data.page_size,
          data.saved === "true",
          data.query,
          data.list_id,
        ),
      );
    }
    if (s[0] === "leads" && s[1]) {
      const business = await getBusiness(c, s[1]);
      const [activity, analyses] = await Promise.all([
        rows(
          "SELECT * FROM crm_activities WHERE organization_id=? AND business_id=? ORDER BY created_at DESC LIMIT 50",
          c.orgId,
          business.id,
        ),
        rows<{ data_json: string }>(
          "SELECT data_json FROM website_analyses WHERE organization_id=? AND business_id=? ORDER BY created_at DESC LIMIT 5",
          c.orgId,
          business.id,
        ),
      ]);
      return json({
        business,
        activity,
        analyses: analyses.map((r) => JSON.parse(r.data_json)),
      });
    }
    if (s[0] === "websites")
      return json(s[1] ? await getWebsite(c, s[1]) : await websiteRecords(c));
    if (s[0] === "scripts") return json(await scriptRecords(c));
    if (s[0] === "proposals") return json(await proposalRecords(c));
    if (s[0] === "credits")
      return json(
        await rows(
          "SELECT id,amount,action,created_at FROM credit_transactions WHERE organization_id=? ORDER BY created_at DESC LIMIT 100",
          c.orgId,
        ),
      );
    if (s[0] === "monitors")
      return json(
        await rows(
          "SELECT * FROM monitors WHERE organization_id=? ORDER BY created_at DESC",
          c.orgId,
        ),
      );
    if (s[0] === "jobs")
      return json(
        await rows(
          "SELECT id,kind,status,error_code,created_at FROM jobs WHERE organization_id=? ORDER BY created_at DESC LIMIT 50",
          c.orgId,
        ),
      );
    if (s[0] === "admin") {
      requireAdmin(c);
      return json({
        usage: await rows(
          "SELECT provider,operation,COUNT(*) as requests,SUM(units) as units,SUM(estimated_cost) as estimated_cost,AVG(duration_ms) as latency FROM provider_usage WHERE organization_id=? GROUP BY provider,operation",
          c.orgId,
        ),
        logs: await rows(
          "SELECT action,target_id,detail,created_at FROM audit_logs WHERE organization_id=? ORDER BY created_at DESC LIMIT 60",
          c.orgId,
        ),
        transactions: await rows(
          "SELECT amount,action,created_at FROM credit_transactions WHERE organization_id=? ORDER BY created_at DESC LIMIT 40",
          c.orgId,
        ),
        subscription: await row(
          "SELECT plan,status,period_end FROM subscriptions WHERE organization_id=?",
          c.orgId,
        ),
        users: await rows(
          "SELECT u.name,u.email,m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=?",
          c.orgId,
        ),
        cost_today: await row(
          "SELECT SUM(estimated_cost) as total FROM provider_usage WHERE organization_id=? AND created_at>=?",
          c.orgId,
          new Date().toISOString().slice(0, 10),
        ),
      });
    }
    throw new AppError("NOT_FOUND", "Recurso não encontrado.", 404);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Params) {
  try {
    checkMutation(request);
    const c = await context();
    await initialize(c);
    await rateLimit(`${c.orgId}:write`, 60, 60);
    const { segments: s } = await params;
    const input = await readJson(request);
    return await idempotent(c, request, input, async () => {
      const expensive =
        ["websites", "scripts", "proposals", "jobs"].includes(s[0]) ||
        (s[0] === "leads" &&
          ["enrich", "audit", "batch"].includes(s[s.length - 1]));
      if (expensive) await rateLimit(`${c.orgId}:expensive:${s[0]}`, 15, 60);
      if (s[0] === "search")
        return json(await searchBusinesses(c, searchSchema.parse(input)));
      if (s[0] === "leads" && s[1] === "save")
        return json(await saveLead(c, leadSchema.parse(input)));
      if (s[0] === "leads" && s[1] === "batch")
        return json(await batchLeads(c, batchSchema.parse(input)));
      if (s[0] === "leads" && s[2] === "enrich")
        return json(await enrichBusiness(c, s[1]));
      if (s[0] === "leads" && s[2] === "audit")
        return json(await analyzeWebsite(c, s[1]));
      if (s[0] === "websites" && !s[1]) {
        const data = generateSchema.parse(input);
        return json(await createWebsite(c, data.business_id, data.data), 201);
      }
      if (s[0] === "websites" && s[1] && s[2] === "publish")
        return json(await publishWebsite(c, s[1]));
      if (s[0] === "websites" && s[1] && s[2] === "edit") {
        const data = z
          .object({
            instruction: z.string().min(5).max(1000),
            section: z.string().max(50).optional(),
          })
          .strict()
          .parse(input);
        return json(
          await editWebsiteAI(c, s[1], data.instruction, data.section),
        );
      }
      if (s[0] === "websites" && s[1]) {
        const data = z
          .object({ content: contentSchema, version: z.number().int().min(1) })
          .strict()
          .parse(input);
        return json(await updateWebsite(c, s[1], data.content, data.version));
      }
      if (s[0] === "scripts" && s[1]) {
        const data = z
          .object({ content: z.string().min(5).max(5000) })
          .strict()
          .parse(input);
        const r = await run(
          "UPDATE sales_scripts SET content=? WHERE id=? AND organization_id=?",
          data.content,
          s[1],
          c.orgId,
        );
        if (!r.meta.changes)
          throw new AppError("NOT_FOUND", "Abordagem não encontrada.", 404);
        return json({ saved: true });
      }
      if (s[0] === "scripts") {
        const data = scriptSchema.parse(input);
        return json(
          await createScript(
            c,
            data.business_id,
            data.channel,
            data.kind,
            data.objection,
          ),
          201,
        );
      }
      if (s[0] === "proposals")
        return json(await createProposal(c, proposalSchema.parse(input)), 201);
      if (s[0] === "lists") {
        const data = z
          .object({ name: z.string().min(2).max(100) })
          .strict()
          .parse(input);
        const listId = id("list");
        await run(
          "INSERT INTO lead_lists (id,organization_id,name,created_at) VALUES (?,?,?,?)",
          listId,
          c.orgId,
          data.name,
          now(),
        );
        return json({ id: listId, name: data.name, count: 0 }, 201);
      }
      if (s[0] === "settings") {
        const settings = settingsSchema.parse(input);
        if (settings.provider === "mock") requireDemo();
        const costsChanged = (["credit_costs", "unit_costs"] as const).some(
          (key) =>
            JSON.stringify(Object.entries(settings[key]).sort()) !==
            JSON.stringify(Object.entries(c.settings[key]).sort()),
        );
        if (costsChanged) requireCreditManager(c);
        if (
          settings.provider === "licensed" &&
          !(await boot(c)).provider_status.licensed
        )
          throw new AppError(
            "PROVIDER_NOT_CONFIGURED",
            "O provedor licenciado ainda não foi configurado.",
            422,
          );
        await run(
          "UPDATE organizations SET settings_json=?,updated_at=? WHERE id=?",
          JSON.stringify(settings),
          now(),
          c.orgId,
        );
        await audit(
          c,
          "settings.update",
          c.orgId,
          "Configurações do workspace atualizadas",
        );
        return json(settings);
      }
      if (s[0] === "workspace" && s[1] === "delete-data") {
        requireOwner(c);
        z.object({ confirmation: z.literal("EXCLUIR") })
          .strict()
          .parse(input);
        const { deleteCommercialData } = await import(
          "@/lib/server/delete-data"
        );
        return json(await deleteCommercialData(c));
      }
      if (s[0] === "monitors" && s[1] && s[2] === "run") {
        const monitor = await row<{ filters_json: string }>(
          "SELECT filters_json FROM monitors WHERE id=? AND organization_id=?",
          s[1],
          c.orgId,
        );
        if (!monitor)
          throw new AppError("NOT_FOUND", "Monitor não encontrado.", 404);
        const result = await searchBusinesses(
          c,
          searchSchema.parse(JSON.parse(monitor.filters_json)),
        );
        await run(
          "UPDATE monitors SET last_run_at=? WHERE id=? AND organization_id=?",
          now(),
          s[1],
          c.orgId,
        );
        return json(result);
      }
      if (s[0] === "monitors" && s[1]) {
        const data = z.object({ enabled: z.boolean() }).strict().parse(input);
        if (data.enabled && !(await boot(c)).provider_status.scheduler)
          throw new AppError(
            "SCHEDULER_NOT_CONFIGURED",
            "O agendador periódico ainda não está conectado.",
            503,
          );
        const changed = await run(
          "UPDATE monitors SET enabled=? WHERE id=? AND organization_id=?",
          data.enabled,
          s[1],
          c.orgId,
        );
        if (!changed.meta.changes)
          throw new AppError("NOT_FOUND", "Monitor não encontrado.", 404);
        return json({ enabled: data.enabled });
      }
      if (s[0] === "monitors") {
        const data = z
          .object({
            name: z.string().min(2).max(180),
            filters: searchSchema,
            interval_hours: z.number().int().min(24).max(720),
            enabled: z.boolean(),
          })
          .strict()
          .parse(input);
        return json(await createMonitor(c, data), 201);
      }
      if (s[0] === "jobs" && s[1] === "process")
        return json(await processJobs(c));
      if (s[0] === "admin" && s[1] === "credits") {
        requireAdmin(c);
        requireCreditManager(c);
        const data = z
          .object({ amount: z.number().int().min(1).max(1000) })
          .strict()
          .parse(input);
        const { batch } = await import("@/lib/server/db");
        await batch([
          {
            sql: "UPDATE organizations SET credits=credits+? WHERE id=?",
            args: [data.amount, c.orgId],
          },
          {
            sql: "INSERT INTO credit_transactions (id,organization_id,amount,action,created_at) VALUES (?,?,?,?,?)",
            args: [
              id("credit"),
              c.orgId,
              data.amount,
              "admin_development_grant",
              now(),
            ],
          },
        ]);
        await audit(
          c,
          "credits.grant",
          c.orgId,
          `${data.amount} créditos de desenvolvimento`,
        );
        return json({ granted: data.amount });
      }
      if (s[0] === "admin" && s[1] === "subscription") {
        requireAdmin(c);
        const data = z
          .object({
            plan: z.string().min(2).max(80),
            status: z.enum(["trial", "active", "paused"]),
          })
          .strict()
          .parse(input);
        await run(
          "UPDATE subscriptions SET plan=?,status=? WHERE organization_id=?",
          data.plan,
          data.status,
          c.orgId,
        );
        await audit(
          c,
          "subscription.update",
          c.orgId,
          "Plano atualizado manualmente; sem cobrança",
        );
        return json(data);
      }
      throw new AppError("NOT_FOUND", "Ação não encontrada.", 404);
    });
  } catch (e) {
    return errorResponse(e);
  }
}
