import type {
  Business,
  BootData,
  WebsiteRecord,
  ScriptRecord,
  ProposalRecord,
} from "@/lib/domain/types";
import { demoEnabled, businessVisibility } from "./environment";
import { DEFAULT_FILTERS, STAGES } from "@/lib/domain/constants";
import { scoreBusiness } from "@/lib/domain/scoring";
import { stableHash } from "@/lib/domain/geo";
import { fixtureBusinesses, MockProvider } from "@/lib/providers/mock";
import { batch, id, now, row, rows, run, runtime } from "./db";
import { AppError, canManageCredits, isAdmin, type Context } from "./security";
export async function saveBusinesses(
  c: Context,
  items: Business[],
): Promise<Business[]> {
  const date = now();
  const mapped = items.map((b) => ({
    ...b,
    id: b.id.startsWith(c.orgId + "_") ? b.id : `${c.orgId}_${b.id}`,
  }));
  for (let i = 0; i < mapped.length; i += 10) {
    await batch(
      mapped.slice(i, i + 10).flatMap((b) => {
        if (!b.can_persist)
          throw new AppError(
            "LICENSE_RESTRICTION",
            "A fonte não autoriza persistência deste resultado.",
            403,
          );
        const loc = `loc_${b.id}`;
        const score = scoreBusiness(b, c.settings.score_weights);
        b.lead_score = score.score;
        b.score_reasons = score.reasons;
        return [
          {
            sql: "INSERT INTO locations (id,organization_id,country,state,city,neighborhood,postal_code,address,latitude,longitude) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET country=excluded.country,state=excluded.state,city=excluded.city,neighborhood=excluded.neighborhood,postal_code=excluded.postal_code,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude",
            args: [
              loc,
              c.orgId,
              b.country,
              b.state,
              b.city,
              b.neighborhood,
              b.postal_code,
              b.address,
              b.latitude,
              b.longitude,
            ],
          },
          {
            sql: "INSERT INTO businesses (id,organization_id,location_id,business_name,category,source,website_status,lead_score,data_json,last_checked_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET business_name=excluded.business_name,category=excluded.category,source=excluded.source,location_id=excluded.location_id,data_json=excluded.data_json,website_status=excluded.website_status,lead_score=excluded.lead_score,last_checked_at=excluded.last_checked_at,updated_at=excluded.updated_at",
            args: [
              b.id,
              c.orgId,
              loc,
              b.business_name,
              b.category,
              b.source,
              b.website_status,
              b.lead_score,
              JSON.stringify(b),
              b.last_checked_at,
              b.created_at,
              date,
            ],
          },
          {
            sql: "INSERT INTO business_sources (id,organization_id,business_id,provider,external_id,source_url,license,can_export,checked_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider=excluded.provider,external_id=excluded.external_id,source_url=excluded.source_url,license=excluded.license,can_export=excluded.can_export,checked_at=excluded.checked_at",
            args: [
              `src_${b.id}_${b.source}`,
              c.orgId,
              b.id,
              b.source,
              String(b.fields.external_id?.value ?? b.id),
              b.source_url,
              b.source === "osm"
                ? "ODbL 1.0"
                : b.source === "mock"
                  ? "Fictício · desenvolvimento"
                  : "Retenção autorizada pelo provedor",
              b.can_export,
              date,
            ],
          },
          {
            sql: "INSERT INTO digital_presences (id,organization_id,business_id,status,evidence_json,checked_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,evidence_json=excluded.evidence_json,checked_at=excluded.checked_at",
            args: [
              `dp_${b.id}`,
              c.orgId,
              b.id,
              b.website_status,
              JSON.stringify(b.digital_presence),
              date,
            ],
          },
        ];
      }),
    );
  }
  return mapped;
}
interface BusinessRow {
  data_json: string;
  stage: string | null;
  notes: string | null;
  tags_json: string | null;
  list_id: string | null;
  saved_id: string | null;
}
function deserialize(r: BusinessRow): Business {
  const b = JSON.parse(r.data_json) as Business;
  return {
    ...b,
    saved: !!r.saved_id,
    lead_status: r.stage ?? "Descoberto",
    notes: r.notes ?? "",
    tags: r.tags_json ? JSON.parse(r.tags_json) : [],
    list_id: r.list_id,
  };
}
const businessJoin =
  "SELECT b.data_json,l.id as saved_id,l.stage,l.notes,l.tags_json,l.list_id FROM businesses b LEFT JOIN leads l ON l.business_id=b.id AND l.organization_id=b.organization_id";
export async function getBusinesses(c: Context) {
  return (
    await rows<BusinessRow>(
      `${businessJoin} WHERE b.organization_id=? AND ${businessVisibility()} ORDER BY (l.id IS NOT NULL) DESC,b.lead_score DESC LIMIT 500`,
      c.orgId,
    )
  ).map(deserialize);
}
export async function getBusinessPage(
  c: Context,
  page: number,
  pageSize: number,
  savedOnly = false,
  query = "",
  listId = "",
) {
  const where = `b.organization_id=? AND ${businessVisibility()} ${savedOnly ? "AND l.id IS NOT NULL" : ""} ${query ? "AND (b.business_name ILIKE ? OR b.category ILIKE ? OR l.tags_json::text ILIKE ?)" : ""} ${listId ? "AND l.list_id=?" : ""}`;
  const args: string[] = query
    ? [c.orgId, `%${query}%`, `%${query}%`, `%${query}%`]
    : [c.orgId];
  if (listId) args.push(listId);
  const [items, count] = await Promise.all([
    rows<BusinessRow>(
      `${businessJoin} WHERE ${where} ORDER BY b.lead_score DESC,b.id LIMIT ? OFFSET ?`,
      ...args,
      pageSize,
      (page - 1) * pageSize,
    ),
    row<{ total: number }>(
      `SELECT COUNT(*) as total FROM businesses b LEFT JOIN leads l ON l.business_id=b.id AND l.organization_id=b.organization_id WHERE ${where}`,
      ...args,
    ),
  ]);
  return {
    businesses: items.map(deserialize),
    total: count?.total ?? 0,
    page,
    page_size: pageSize,
  };
}
export async function getBusinessesByIds(c: Context, ids: string[]) {
  const unique = [...new Set(ids)];
  const items: Business[] = [];
  for (let i = 0; i < unique.length; i += 80) {
    const part = unique.slice(i, i + 80);
    items.push(
      ...(
        await rows<BusinessRow>(
          `${businessJoin} WHERE b.organization_id=? AND ${businessVisibility()} AND b.id IN (${part.map(() => "?").join(",")})`,
          c.orgId,
          ...part,
        )
      ).map(deserialize),
    );
  }
  if (items.length !== unique.length)
    throw new AppError(
      "NOT_FOUND",
      "Um dos leads não foi encontrado no seu workspace.",
      404,
    );
  const byId = new Map(items.map((b) => [b.id, b]));
  return unique.map((key) => byId.get(key)!);
}
export async function getSourceCandidates(
  c: Context,
  provider: string,
  externalIds: string[],
) {
  const result: Business[] = [];
  for (let i = 0; i < externalIds.length; i += 80) {
    const ids = externalIds.slice(i, i + 80);
    result.push(
      ...(
        await rows<BusinessRow>(
          `${businessJoin} JOIN business_sources s ON s.business_id=b.id AND s.organization_id=b.organization_id WHERE b.organization_id=? AND ${businessVisibility()} AND s.provider=? AND s.external_id IN (${ids.map(() => "?").join(",")})`,
          c.orgId,
          provider,
          ...ids,
        )
      ).map(deserialize),
    );
  }
  return result;
}
export async function getBusiness(c: Context, businessId: string) {
  const r = await row<BusinessRow>(
    `${businessJoin} WHERE b.organization_id=? AND b.id=? AND ${businessVisibility()}`,
    c.orgId,
    businessId,
  );
  if (!r)
    throw new AppError(
      "NOT_FOUND",
      "Este lead não foi encontrado no seu workspace.",
      404,
    );
  return deserialize(r);
}
export async function activity(
  c: Context,
  businessId: string,
  action: string,
  detail: string,
) {
  await run(
    "INSERT INTO crm_activities (id,organization_id,business_id,user_id,action,detail,created_at) VALUES (?,?,?,?,?,?,?)",
    id("activity"),
    c.orgId,
    businessId,
    c.userId,
    action,
    detail,
    now(),
  );
}
export async function saveLead(
  c: Context,
  input: {
    business_id: string;
    stage?: string;
    notes?: string;
    tags?: string[];
    list_id?: string | null;
  },
) {
  const b = await getBusiness(c, input.business_id);
  const date = now();
  const stage = input.stage ?? b.lead_status;
  const tags = input.tags ?? b.tags;
  const list = input.list_id === undefined ? b.list_id : input.list_id;
  if (
    list &&
    !(await row(
      "SELECT id FROM lead_lists WHERE id=? AND organization_id=?",
      list,
      c.orgId,
    ))
  )
    throw new AppError("NOT_FOUND", "Lista não encontrada.", 404);
  const leadId = `lead_${b.id}`;
  const statements = [
    {
      sql: "INSERT INTO leads (id,organization_id,business_id,stage_id,stage,list_id,notes,tags_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(organization_id,business_id) DO UPDATE SET stage_id=CASE WHEN ? THEN excluded.stage_id ELSE leads.stage_id END,stage=CASE WHEN ? THEN excluded.stage ELSE leads.stage END,list_id=CASE WHEN ? THEN excluded.list_id ELSE leads.list_id END,notes=CASE WHEN ? THEN excluded.notes ELSE leads.notes END,tags_json=CASE WHEN ? THEN excluded.tags_json ELSE leads.tags_json END,updated_at=excluded.updated_at",
      args: [
        leadId,
        c.orgId,
        b.id,
        `${c.orgId}_stage_${STAGES.indexOf(stage)}`,
        stage,
        list,
        input.notes ?? b.notes,
        JSON.stringify(tags),
        date,
        date,
        input.stage !== undefined,
        input.stage !== undefined,
        input.list_id !== undefined,
        input.notes !== undefined,
        input.tags !== undefined,
      ],
    },
  ];
  if (input.tags !== undefined || !b.saved)
    statements.push({
      sql: "DELETE FROM lead_tag_links WHERE lead_id=?",
      args: [leadId],
    });
  for (const tag of input.tags !== undefined || !b.saved ? tags : []) {
    const tagId = `${c.orgId}_tag_${stableHash(tag)}`;
    statements.push(
      {
        sql: "INSERT INTO lead_tags (id,organization_id,name,color) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING",
        args: [tagId, c.orgId, tag, "#6956e8"],
      },
      {
        sql: "INSERT INTO lead_tag_links (organization_id,lead_id,tag_id) VALUES (?,?,?) ON CONFLICT(lead_id,tag_id) DO NOTHING",
        args: [c.orgId, leadId, tagId],
      },
    );
  }
  statements.push(
    {
      sql: "INSERT INTO crm_activities (id,organization_id,business_id,user_id,action,detail,created_at) VALUES (?,?,?,?,?,?,?)",
      args: [
        id("activity"),
        c.orgId,
        b.id,
        c.userId,
        "Lead atualizado",
        input.stage !== undefined
          ? `Estágio: ${stage}`
          : "Alterações salvas no CRM",
        date,
      ],
    },
    {
      sql: "INSERT INTO audit_logs (id,organization_id,user_id,action,target_id,detail,created_at) VALUES (?,?,?,?,?,?,?)",
      args: [
        id("audit"),
        c.orgId,
        c.userId,
        "lead.update",
        b.id,
        input.stage ?? "Campos comerciais atualizados",
        date,
      ],
    },
  );
  await batch(statements);
  /* Activity and audit commit together with the lead. */
  return getBusiness(c, b.id);
}
export async function websiteRecords(c: Context): Promise<WebsiteRecord[]> {
  return (
    await rows<Record<string, unknown>>(
      `SELECT w.* FROM generated_websites w JOIN businesses b ON b.id=w.business_id AND b.organization_id=w.organization_id WHERE w.organization_id=? AND ${businessVisibility()} ORDER BY w.updated_at DESC LIMIT 100`,
      c.orgId,
    )
  ).map(
    (r) =>
      ({
        ...r,
        content: JSON.parse(String(r.content_json)),
      }) as unknown as WebsiteRecord,
  );
}
export async function scriptRecords(c: Context): Promise<ScriptRecord[]> {
  return rows<ScriptRecord>(
    `SELECT w.* FROM sales_scripts w JOIN businesses b ON b.id=w.business_id AND b.organization_id=w.organization_id WHERE w.organization_id=? AND ${businessVisibility()} ORDER BY w.created_at DESC LIMIT 100`,
    c.orgId,
  );
}
export async function proposalRecords(c: Context): Promise<ProposalRecord[]> {
  return (
    await rows<Record<string, unknown>>(
      `SELECT w.* FROM proposals w JOIN businesses b ON b.id=w.business_id AND b.organization_id=w.organization_id WHERE w.organization_id=? AND ${businessVisibility()} ORDER BY w.created_at DESC LIMIT 100`,
      c.orgId,
    )
  ).map(
    (r) =>
      ({
        ...r,
        scope: JSON.parse(String(r.scope_json)),
        evidence: JSON.parse(String(r.evidence_json)),
      }) as unknown as ProposalRecord,
  );
}
export async function initialize(c: Context) {
  await batch(
    STAGES.map((stage, i) => ({
      sql: "INSERT INTO crm_stages (id,organization_id,name,position) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING",
      args: [`${c.orgId}_stage_${i}`, c.orgId, stage, i],
    })),
  );
  const org = await row<{ initialized: boolean }>(
    "SELECT initialized FROM organizations WHERE id=?",
    c.orgId,
  );
  if (org?.initialized) return;
  if (demoEnabled() && c.settings.provider === "mock") {
    const center = await new MockProvider().getCoordinates(DEFAULT_FILTERS);
    await saveBusinesses(c, fixtureBusinesses(DEFAULT_FILTERS, center));
  }
  await batch([
    {
      sql: "INSERT INTO subscriptions (id,organization_id,plan,status,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
      args: [
        `sub_${c.orgId}`,
        c.orgId,
        demoEnabled() ? "Desenvolvimento" : "Avaliação",
        "trial",
        now(),
      ],
    },
    {
      sql: "INSERT INTO credit_transactions (id,organization_id,amount,action,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
      args: [`welcome_${c.orgId}`, c.orgId, 250, "welcome", now()],
    },
    {
      sql: "UPDATE organizations SET initialized=true WHERE id=?",
      args: [c.orgId],
    },
  ]);
}
export async function boot(c: Context): Promise<BootData> {
  await initialize(c);
  const [
    businesses,
    lists,
    searches,
    websites,
    scripts,
    proposals,
    activities,
    org,
  ] = await Promise.all([
    getBusinesses(c),
    rows<{ id: string; name: string; count: number }>(
      `SELECT x.id,x.name,COUNT(b.id) as count FROM lead_lists x LEFT JOIN leads l ON l.list_id=x.id AND l.organization_id=x.organization_id LEFT JOIN businesses b ON b.id=l.business_id AND b.organization_id=l.organization_id AND ${businessVisibility()} WHERE x.organization_id=? GROUP BY x.id ORDER BY x.created_at DESC`,
      c.orgId,
    ),
    rows<{
      id: string;
      name: string;
      result_count: number;
      created_at: string;
      filters_json: string;
    }>(
      `SELECT * FROM searches WHERE organization_id=? ${demoEnabled() ? "" : "AND provider<>'mock'"} ORDER BY created_at DESC LIMIT 30`,
      c.orgId,
    ),
    websiteRecords(c),
    scriptRecords(c),
    proposalRecords(c),
    rows<BootData["activity"][number]>(
      `SELECT a.id,a.business_id,a.action,a.detail,a.created_at FROM crm_activities a JOIN businesses b ON b.id=a.business_id AND b.organization_id=a.organization_id WHERE a.organization_id=? AND ${businessVisibility()} ORDER BY a.created_at DESC LIMIT 40`,
      c.orgId,
    ),
    row<{ credits: number; name: string }>(
      "SELECT credits,name FROM organizations WHERE id=?",
      c.orgId,
    ),
  ]);
  const stats = await row<BootData["stats"]>(
    `SELECT COUNT(b.id) as found,COUNT(*) FILTER (WHERE b.website_status IN ('not_identified','social_only','aggregator','directory')) as no_site,COUNT(*) FILTER (WHERE b.lead_score>=80) as strong,COUNT(*) FILTER (WHERE l.stage='Negociação') as negotiating,COUNT(*) FILTER (WHERE l.stage='Fechado') as closed,COUNT(l.id) as saved,(SELECT COUNT(*) FROM generated_websites WHERE organization_id=? AND business_id IN (SELECT id FROM businesses b WHERE ${businessVisibility()})) as sites FROM businesses b LEFT JOIN leads l ON l.business_id=b.id AND l.organization_id=b.organization_id WHERE b.organization_id=? AND ${businessVisibility()}`,
    c.orgId,
    c.orgId,
  );
  return {
    user: { name: c.name, email: c.email, role: c.role },
    organization: {
      id: c.orgId,
      name: org?.name ?? "Meu workspace",
      credits: org?.credits ?? 0,
    },
    settings: c.settings,
    businesses,
    lists,
    searches: searches.map((r) => ({
      ...r,
      count: r.result_count,
      filters: JSON.parse(r.filters_json),
    })),
    websites,
    scripts,
    proposals,
    activity: activities,
    stats: stats ?? {
      found: 0,
      no_site: 0,
      strong: 0,
      negotiating: 0,
      closed: 0,
      saved: 0,
      sites: 0,
    },
    provider_status: {
      mock: demoEnabled(),
      admin: isAdmin(c),
      osm: true,
      licensed: !!runtime().LEAD_PROVIDER_URL && !!runtime().LEAD_PROVIDER_KEY,
      ai: !!runtime().GEMINI_API_KEY && !!runtime().GEMINI_MODEL,
      audit: !!runtime().WEBSITE_AUDIT_URL,
      scheduler:
        runtime().SCHEDULER_ENABLED === "true" && !!runtime().SCHEDULER_SECRET,
      manage_credits: canManageCredits(c),
    },
  };
}
