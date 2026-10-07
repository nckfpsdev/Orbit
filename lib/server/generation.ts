import { UPDATE_WEBSITE_VERSION } from "./atomic-queries";
import { z } from "zod";
import type {
  WebsiteContent,
  WebsiteRecord,
  Channel,
  ProposalRecord,
} from "@/lib/domain/types";
import { websiteDraft, generateScript } from "@/lib/domain/generation";
import { slugify } from "@/lib/domain/geo";
import { contentSchema } from "./validation";
import { id, now, run, row, batch, runtime } from "./db";
import { type Context, AppError, audit } from "./security";
import { withCredits } from "./credits";
import { getBusiness, activity } from "./store";
import { aiJson, copySchema, copyJsonSchema } from "./ai";
export async function getWebsite(
  c: Context,
  websiteId: string,
): Promise<WebsiteRecord> {
  const r = await row<Record<string, unknown>>(
    "SELECT * FROM generated_websites WHERE id=? AND organization_id=?",
    websiteId,
    c.orgId,
  );
  if (!r) throw new AppError("NOT_FOUND", "Demonstração não encontrada.", 404);
  await getBusiness(c, String(r.business_id));
  return {
    ...r,
    content: JSON.parse(String(r.content_json)),
  } as unknown as WebsiteRecord;
}
export async function createWebsite(
  c: Context,
  businessId: string,
  data?: WebsiteContent,
) {
  const b = await getBusiness(c, businessId);
  return (
    await withCredits(
      c,
      "website",
      async () => {
        let content = data ?? websiteDraft(b);
        let engine: WebsiteRecord["engine"] = "local";
        if (content.image_url && !content.image_attribution)
          throw new AppError(
            "IMAGE_RIGHTS",
            "Informe a licença ou autorização da imagem antes de gerar.",
            422,
          );
        if (runtime().GEMINI_API_KEY && runtime().GEMINI_MODEL) {
          try {
            const copy = await aiJson(
              c,
              `Escreva uma proposta de site no estilo ${content.style}. Fatos comerciais revisados: ${JSON.stringify(content)}. Retorne apenas headline, subtitle, about e cta.`,
              copySchema,
              copyJsonSchema,
            );
            content = { ...content, ...copy };
            engine = "gemini";
          } catch (error) {
            if (!(error instanceof AppError)) throw error;
            await audit(
              c,
              "ai.fallback",
              b.id,
              `Composição local: ${error.code}`,
            );
          }
        }
        content = contentSchema.parse(content);
        const websiteId = id("site");
        const date = now();
        const slug = `${slugify(content.name)}-${websiteId.slice(-8)}`;
        await batch([
          {
            sql: "INSERT INTO generated_websites (id,organization_id,business_id,business_name,slug,status,content_json,engine,version,created_at,updated_at) VALUES (?,?,?,?,?,'draft',?,?,1,?,?)",
            args: [
              websiteId,
              c.orgId,
              b.id,
              b.business_name,
              slug,
              JSON.stringify(content),
              engine,
              date,
              date,
            ],
          },
          {
            sql: "INSERT INTO website_versions (id,organization_id,website_id,version,content_json,change_note,created_at) VALUES (?,?,?,1,?,?,?)",
            args: [
              id("version"),
              c.orgId,
              websiteId,
              JSON.stringify(content),
              "Versão inicial revisada",
              date,
            ],
          },
        ]);
        await activity(
          c,
          b.id,
          "Demonstração criada",
          `Estilo ${content.style} · ${engine === "local" ? "composição local por nicho" : "IA Gemini"}`,
        );
        await audit(c, "website.create", websiteId, "Demonstração comercial");
        return getWebsite(c, websiteId);
      },
      b.id,
    )
  ).result;
}
export async function updateWebsite(
  c: Context,
  websiteId: string,
  content: WebsiteContent,
  version: number,
  note = "Conteúdo editado",
) {
  const website = await getWebsite(c, websiteId);
  if (website.version !== version)
    throw new AppError(
      "VERSION_CONFLICT",
      "O site foi atualizado em outra janela. Recarregue antes de salvar.",
      409,
    );
  if (content.image_url && !content.image_attribution)
    throw new AppError(
      "IMAGE_RIGHTS",
      "Informe a licença ou autorização da imagem.",
      422,
    );
  const date = now();
  const changed = await run(
    UPDATE_WEBSITE_VERSION,
    JSON.stringify(content),
    date,
    websiteId,
    c.orgId,
    version,
    id("version"),
    note,
    date,
  );
  if (!changed.meta.changes)
    throw new AppError(
      "VERSION_CONFLICT",
      "Outra alteração foi salva. Recarregue o editor.",
      409,
    );
  await audit(c, "website.update", websiteId, note);
  return getWebsite(c, websiteId);
}
export async function editWebsiteAI(
  c: Context,
  websiteId: string,
  instruction: string,
  section?: string,
) {
  const website = await getWebsite(c, websiteId);
  if (!runtime().GEMINI_API_KEY || !runtime().GEMINI_MODEL)
    throw new AppError(
      "AI_NOT_CONFIGURED",
      "A integração de IA ainda não está conectada. Use os controles de conteúdo, cores e estilo.",
      503,
    );
  return (
    await withCredits(
      c,
      "regenerate",
      async () => {
        const copy = await aiJson(
          c,
          `Edite a copy deste site comercial. Pedido do usuário: ${instruction}. ${section ? `Seção escolhida: ${section}.` : ""} Dados e conteúdo existentes: ${JSON.stringify(website.content)}. Preserve os fatos. Retorne headline, subtitle, about e cta.`,
          copySchema,
          copyJsonSchema,
        );
        return updateWebsite(
          c,
          websiteId,
          { ...website.content, ...copy },
          website.version,
          "Copy editada com IA",
        );
      },
      websiteId,
    )
  ).result;
}
export async function publishWebsite(c: Context, websiteId: string) {
  const site = await getWebsite(c, websiteId);
  await run(
    "UPDATE generated_websites SET status='published',updated_at=? WHERE id=? AND organization_id=?",
    now(),
    websiteId,
    c.orgId,
  );
  await audit(
    c,
    "website.publish",
    site.id,
    "Demonstração comercial com noindex e aviso permanente",
  );
  await activity(
    c,
    site.business_id,
    "Demonstração publicada",
    `/preview/${site.slug}`,
  );
  return getWebsite(c, websiteId);
}
export async function createScript(
  c: Context,
  businessId: string,
  channel: Channel,
  kind: string,
  objection?: string,
) {
  const b = await getBusiness(c, businessId);
  const site = await row<{ slug: string }>(
    "SELECT slug FROM generated_websites WHERE organization_id=? AND business_id=? AND status='published' ORDER BY updated_at DESC LIMIT 1",
    c.orgId,
    b.id,
  );
  return (
    await withCredits(
      c,
      "script",
      async () => {
        const previewUrl = site
          ? `${runtime().APP_ORIGIN ?? ""}/preview/${site.slug}`
          : undefined;
        let content = generateScript(
          b,
          channel,
          c.settings,
          previewUrl,
          kind,
          objection,
        );
        let engine = "local";
        if (runtime().GEMINI_API_KEY && runtime().GEMINI_MODEL) {
          try {
            const result = await aiJson(
              c,
              `Reescreva esta abordagem de ${channel}, tipo ${kind}, de forma curta, humana e profissional. Preserve a incerteza sobre site, não prometa resultados e respeite recusas. Não invente fatos nem alegue inspeção visual. Fatos: ${JSON.stringify({ name: b.business_name, category: b.category, city: b.city, presence: b.digital_presence.explanation })}. Rascunho: ${content}`,
              z.object({ content: z.string().min(10).max(5000) }),
              {
                type: "object",
                properties: { content: { type: "string" } },
                required: ["content"],
                additionalProperties: false,
              },
            );
            content = result.content;
            engine = "gemini";
          } catch (error) {
            if (!(error instanceof AppError)) throw error;
            await audit(
              c,
              "ai.fallback",
              b.id,
              `Abordagem local: ${error.code}`,
            );
          }
        }
        const scriptId = id("script");
        await run(
          "INSERT INTO sales_scripts (id,organization_id,business_id,business_name,channel,kind,content,engine,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
          scriptId,
          c.orgId,
          b.id,
          b.business_name,
          channel,
          kind,
          content,
          engine,
          now(),
        );
        await activity(
          c,
          b.id,
          "Abordagem preparada",
          `${channel} · revisão humana pendente`,
        );
        return {
          id: scriptId,
          business_id: b.id,
          business_name: b.business_name,
          channel,
          kind,
          content,
          engine,
          created_at: now(),
        };
      },
      b.id,
    )
  ).result;
}
export async function createProposal(
  c: Context,
  input: {
    business_id: string;
    website_id?: string | null;
    price: number;
    delivery_days: number;
    scope: string[];
  },
): Promise<ProposalRecord> {
  const b = await getBusiness(c, input.business_id);
  const website = input.website_id
    ? await getWebsite(c, input.website_id)
    : null;
  if (website && website.business_id !== b.id)
    throw new AppError(
      "INVALID_WEBSITE",
      "A demonstração deve pertencer ao mesmo lead.",
      422,
    );
  return (
    await withCredits(
      c,
      "proposal",
      async () => {
        const evidence = [b.digital_presence.explanation];
        const measured = await row<{ data_json: string }>(
          "SELECT data_json FROM website_analyses WHERE organization_id=? AND business_id=? AND mode='measured' ORDER BY created_at DESC LIMIT 1",
          c.orgId,
          b.id,
        );
        if (measured) {
          const a = JSON.parse(measured.data_json);
          evidence.push(
            ...a.checks
              .filter((x: { status: string }) => x.status === "fail")
              .map(
                (x: { name: string; detail: string }) =>
                  `${x.name}: ${x.detail}`,
              ),
          );
        }
        const proposal: ProposalRecord = {
          id: id("proposal"),
          business_id: b.id,
          business_name: b.business_name,
          price: input.price,
          delivery_days: input.delivery_days,
          scope: input.scope,
          evidence,
          website_id: website?.id ?? null,
          agency_name: c.settings.agency_name,
          status: "draft",
          created_at: now(),
        };
        await run(
          "INSERT INTO proposals (id,organization_id,business_id,website_id,business_name,price,scope_json,evidence_json,delivery_days,agency_name,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          proposal.id,
          c.orgId,
          b.id,
          proposal.website_id,
          b.business_name,
          proposal.price,
          JSON.stringify(proposal.scope),
          JSON.stringify(evidence),
          proposal.delivery_days,
          proposal.agency_name,
          "draft",
          proposal.created_at,
        );
        await activity(
          c,
          b.id,
          "Proposta preparada",
          `${proposal.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · rascunho`,
        );
        return proposal;
      },
      b.id,
    )
  ).result;
}
