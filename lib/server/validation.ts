import { z } from "zod";
import {
  DEFAULT_FILTERS,
  DEFAULT_SETTINGS,
  STATES,
  STAGES,
  CHANNELS,
} from "@/lib/domain/constants";
const short = z.string().trim().max(180);
export const searchSchema = z
  .object({
    country: z.literal("Brasil").default("Brasil"),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => STATES.includes(v), "Estado inválido")
      .default("CE"),
    city: short.min(2).default("Fortaleza"),
    neighborhood: short.default(""),
    postal_code: z
      .string()
      .regex(/^(\d{5}-?\d{3})?$/, "CEP inválido")
      .default(""),
    radius: z.number().min(1).max(50).default(10),
    category: short.min(2).default("Clínicas odontológicas"),
    sub_category: short.default(""),
    query: z.string().max(600).default(""),
    provider: z.enum(["mock", "osm", "licensed"]).default("osm"),
    prioritize_no_site: z.boolean().default(true),
    website_filter: z
      .enum([
        "all",
        "no_own",
        "none",
        "instagram",
        "facebook",
        "own_website",
        "unavailable",
        "needs_improvement",
        "inconclusive",
        "aggregator",
        "directory",
      ])
      .default("all"),
    min_rating: z.number().min(0).max(5).default(0),
    min_reviews: z.number().int().min(0).max(100000).default(0),
    min_score: z.number().min(0).max(100).default(0),
    has_phone: z.boolean().default(false),
    has_whatsapp: z.boolean().default(false),
    crm_status: z
      .string()
      .refine((v) => v === "all" || STAGES.includes(v))
      .default("all"),
    sort: z
      .enum([
        "score",
        "score_asc",
        "reviews",
        "rating",
        "distance",
        "recent",
        "no_site",
      ])
      .default("score"),
    bounds: z
      .tuple([
        z.number().min(-90).max(90),
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
        z.number().min(-180).max(180),
      ])
      .refine(
        (b) => b[0] < b[2] && b[1] < b[3],
        "Limites geográficos inválidos",
      )
      .optional(),
  })
  .strict();
export const leadSchema = z
  .object({
    business_id: z.string().max(120),
    stage: z
      .string()
      .refine((v) => STAGES.includes(v))
      .optional(),
    notes: z.string().max(5000).optional(),
    tags: z.array(z.string().min(1).max(40)).max(15).optional(),
    list_id: z.string().max(100).nullable().optional(),
  })
  .strict();
export const batchSchema = z
  .object({
    ids: z.array(z.string().max(120)).min(1).max(100),
    action: z.enum(["save", "tag", "move", "analyze"]),
    tag: z.string().max(40).optional(),
    stage: z
      .string()
      .refine((v) => STAGES.includes(v))
      .optional(),
  })
  .strict();
export const contentSchema = z
  .object({
    name: short.min(2),
    category: short,
    city: short,
    address: z.string().max(400),
    phone: z.string().max(40),
    whatsapp: z.string().max(40),
    hours: short,
    instagram: z.string().max(500),
    headline: z.string().min(2).max(180),
    subtitle: z.string().max(600),
    about: z.string().max(1500),
    cta: z.string().max(60),
    services: z
      .array(z.object({ title: short, description: z.string().max(400) }))
      .max(12),
    sections: z
      .array(
        z.enum([
          "services",
          "about",
          "process",
          "location",
          "contact",
          "hours",
        ]),
      )
      .max(6),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    style: z.enum(["clinic", "editorial", "bold", "elegant"]),
    image_url: z
      .string()
      .max(1000)
      .refine(
        (v) => !v || /^https:\/\//.test(v),
        "Use imagem HTTPS autorizada",
      ),
    image_attribution: z.string().max(300),
  })
  .strict();
export const generateSchema = z
  .object({ business_id: z.string().max(120), data: contentSchema.optional() })
  .strict();
export const scriptSchema = z
  .object({
    business_id: z.string().max(120),
    channel: z.enum(CHANNELS).default("WhatsApp"),
    kind: z
      .enum(["first", "followup1", "followup2", "last", "objection"])
      .default("first"),
    objection: z.string().max(200).optional(),
  })
  .strict();
export const proposalSchema = z
  .object({
    business_id: z.string().max(120),
    website_id: z.string().max(100).nullable().optional(),
    price: z.number().min(1).max(1000000),
    delivery_days: z.number().int().min(1).max(180).default(15),
    scope: z.array(z.string().max(180)).min(1).max(12),
  })
  .strict();
export const settingsSchema = z
  .object({
    provider: z.enum(["mock", "osm", "licensed"]),
    sender_name: z.string().max(80),
    agency_name: z.string().min(2).max(80),
    proposal_price: z.number().min(1).max(1000000),
    score_weights: z
      .object(
        Object.fromEntries(
          Object.keys(DEFAULT_SETTINGS.score_weights).map((k) => [
            k,
            z.number().int().min(0).max(50),
          ]),
        ),
      )
      .strict(),
    credit_costs: z
      .object(
        Object.fromEntries(
          Object.keys(DEFAULT_SETTINGS.credit_costs).map((k) => [
            k,
            z.number().int().min(0).max(100),
          ]),
        ),
      )
      .strict(),
    unit_costs: z
      .object(
        Object.fromEntries(
          Object.keys(DEFAULT_SETTINGS.unit_costs).map((k) => [
            k,
            z.number().min(0).max(1000),
          ]),
        ),
      )
      .strict(),
    currency: z.literal("BRL"),
    onboarded: z.boolean(),
  })
  .strict();
export { DEFAULT_FILTERS };
