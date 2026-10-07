import { z } from "zod";
import { isPublicHostname } from "@/lib/domain/url-policy";
import type { WebsiteAudit } from "@/lib/domain/types";
import { publicUrl, buildPresence, classifyUrl } from "@/lib/domain/presence";
import { provider } from "@/lib/providers";
import { fetchJson } from "@/lib/providers/geocoding";
import { parseProviderData } from "@/lib/providers/validation";
import { scoreBusiness } from "@/lib/domain/scoring";
import { runtime, id, now, run, row } from "./db";
import { AppError, rateLimit, type Context } from "./security";
import { withCredits } from "./credits";
import { getBusiness, saveBusinesses, activity, saveLead } from "./store";
export async function enrichBusiness(
  c: Context,
  businessId: string,
  force = false,
) {
  const b = await getBusiness(c, businessId);
  if (
    !force &&
    b.last_checked_at &&
    Date.now() - new Date(b.last_checked_at).getTime() < 86400000
  )
    return { business: b, cached: true, credits_used: 0 };
  const result = await withCredits(
    c,
    "enrich",
    async () => {
      const fresh = await provider(b.source).enrichBusiness(b);
      const date = now();
      const presence = buildPresence({
        business_name: fresh.business_name,
        website: fresh.website,
        instagram: fresh.instagram,
        facebook: fresh.facebook,
        whatsapp: fresh.public_whatsapp,
        source: fresh.digital_presence.website.source,
        checked_at: date,
      });
      if (b.is_demo) {
        presence.website.confidence = 0.82;
        presence.sources_checked = ["Demonstração · evidências fictícias"];
      }
      const business = {
        ...b,
        ...fresh,
        id: b.id,
        digital_presence: presence,
        website_status: presence.status,
        last_checked_at: date,
        updated_at: date,
      };
      const score = scoreBusiness(business, c.settings.score_weights);
      business.lead_score = score.score;
      business.score_reasons = score.reasons;
      await saveBusinesses(c, [business]);
      if (b.saved && b.lead_status === "Descoberto")
        await saveLead(c, { business_id: b.id, stage: "Analisado" });
      await activity(
        c,
        b.id,
        "Presença digital analisada",
        presence.explanation,
      );
      return getBusiness(c, b.id);
    },
    b.id,
  );
  return {
    business: result.result,
    cached: false,
    credits_used: result.credits_used,
  };
}
const auditResponseSchema = z.object({
  safety: z.object({
    public_dns_validated: z.literal(true),
    redirects_validated: z.literal(true),
    robots_checked: z.literal(true),
    final_url: z.string().url(),
  }),
  http_status: z.number().int().min(100).max(599).nullable(),
  response_ms: z.number().nonnegative().nullable(),
  checks: z
    .array(
      z.object({
        name: z.string().max(80),
        status: z.enum(["pass", "fail", "unknown"]),
        detail: z.string().max(400),
      }),
    )
    .max(20),
});
export async function analyzeWebsite(
  c: Context,
  businessId: string,
): Promise<WebsiteAudit> {
  const b = await getBusiness(c, businessId);
  const url = publicUrl(b.website);
  if (!url || classifyUrl(b.website) !== "own_website")
    throw new AppError(
      "NO_WEBSITE",
      "Nenhum domínio próprio disponível para auditoria.",
      422,
    );
  const old = await row<{ data_json: string; created_at: string }>(
    "SELECT data_json,created_at FROM website_analyses WHERE organization_id=? AND business_id=? ORDER BY created_at DESC LIMIT 1",
    c.orgId,
    b.id,
  );
  if (
    old &&
    (JSON.parse(old.data_json).mode === "measured" ||
      !runtime().WEBSITE_AUDIT_URL ||
      b.is_demo) &&
    JSON.parse(old.data_json).url === url.href &&
    Date.now() - new Date(old.created_at).getTime() < 3600000
  )
    return JSON.parse(old.data_json);
  const chargeContext =
    b.is_demo || !runtime().WEBSITE_AUDIT_URL
      ? {
          ...c,
          settings: {
            ...c.settings,
            credit_costs: { ...c.settings.credit_costs, audit: 0 },
          },
        }
      : c;
  const result = await withCredits(
    chargeContext,
    "audit",
    async () => {
      let analysis: WebsiteAudit = {
        id: id("audit"),
        business_id: b.id,
        url: url.href,
        mode: "limited",
        checks: [
          {
            name: "HTTPS declarado",
            status: url.protocol === "https:" ? "pass" : "fail",
            detail:
              "Verificação da URL cadastrada; certificado e conexão ainda não medidos.",
          },
          {
            name: "Disponibilidade",
            status: "unknown",
            detail: "Requer proxy de auditoria seguro.",
          },
          {
            name: "Responsividade",
            status: "unknown",
            detail: "Requer análise do HTML ou navegador.",
          },
          {
            name: "SEO e metadata",
            status: "unknown",
            detail: "Ainda não medidos.",
          },
          {
            name: "Performance",
            status: "unknown",
            detail: "Nenhuma métrica de navegador foi coletada.",
          },
          {
            name: "CTA e contato",
            status: "unknown",
            detail: "Ainda não medidos.",
          },
        ],
        response_ms: null,
        http_status: null,
        checked_at: now(),
        summary: b.is_demo
          ? "Análise ilustrativa: este domínio .example é fictício. Nenhuma requisição foi realizada."
          : "Análise limitada à URL informada. Configure o proxy seguro para medir os demais critérios.",
      };
      if (!b.is_demo && runtime().WEBSITE_AUDIT_URL) {
        if (
          !isPublicHostname(url.hostname) ||
          (url.port && !["80", "443"].includes(url.port))
        )
          throw new AppError(
            "UNSAFE_URL",
            "Esse endereço não pode ser analisado.",
            422,
          );
        await rateLimit(
          "audit_global_daily",
          Number(runtime().GLOBAL_AUDIT_DAILY_LIMIT || 300),
          86400,
        );
        const proxy = runtime().WEBSITE_AUDIT_URL!;
        if (!proxy.startsWith("https://"))
          throw new AppError(
            "AUDIT_CONFIGURATION",
            "O proxy de auditoria precisa usar HTTPS.",
            503,
          );
        const data = parseProviderData(
          auditResponseSchema,
          await fetchJson(proxy, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${runtime().WEBSITE_AUDIT_KEY ?? ""}`,
            },
            body: JSON.stringify({
              url: url.href,
              validate_public_dns: true,
              max_redirects: 4,
              check_robots: true,
              max_bytes: 1000000,
            }),
          }),
        );
        const final = publicUrl(data.safety.final_url);
        if (
          !final ||
          !isPublicHostname(final.hostname) ||
          (final.port && !["80", "443"].includes(final.port))
        )
          throw new AppError(
            "UNSAFE_REDIRECT",
            "O domínio redirecionou para um endereço que não pode ser analisado.",
            422,
          );
        analysis = {
          ...analysis,
          ...data,
          mode: "measured",
          summary:
            "Verificações fornecidas pelo proxy de auditoria. Tempo de resposta HTTP não equivale ao Lighthouse.",
        };
      }
      await run(
        "INSERT INTO website_analyses (id,organization_id,business_id,url,mode,data_json,created_at) VALUES (?,?,?,?,?,?,?)",
        analysis.id,
        c.orgId,
        b.id,
        url.href,
        analysis.mode,
        JSON.stringify(analysis),
        analysis.checked_at,
      );
      if (
        analysis.mode === "measured" &&
        ((analysis.http_status ?? 0) >= 400 ||
          analysis.checks.some((x) => x.status === "fail"))
      ) {
        b.website_status =
          analysis.http_status && analysis.http_status >= 400
            ? "unavailable"
            : "needs_improvement";
        b.digital_presence.status = b.website_status;
        await saveBusinesses(c, [b]);
      }
      await activity(c, b.id, "Site analisado", analysis.summary);
      return analysis;
    },
    b.id,
  );
  return result.result;
}
