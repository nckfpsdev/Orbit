import type { Business, SearchFilters } from "@/lib/domain/types";
import type {
  Coordinates,
  LeadProviderInterface,
  RawBusiness,
} from "./contracts";
import { normalizeBusiness } from "./normalize";
import { fetchJson, geocode } from "./geocoding";
import { row, run, runtime } from "@/lib/server/db";
import { AppError, rateLimit } from "@/lib/server/security";
import { normalizeText, stableHash } from "@/lib/domain/geo";
import { z } from "zod";
import { parseProviderData } from "./validation";
import { providerUserAgent } from "./identity";
const elementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int().positive(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  center: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    })
    .optional(),
  tags: z.record(z.string()).optional(),
});
const responseSchema = z.object({
  elements: z.array(elementSchema).max(1000),
  remark: z.string().max(4000).optional(),
});
export function osmSelectors(category: string): string[] {
  const n = normalizeText(category);
  const map: [RegExp, string[]][] = [
    [/odont|dentist/, ['["amenity"="dentist"]', '["healthcare"="dentist"]']],
    [
      /restaur|pizzar|hamburg/,
      ['["amenity"="restaurant"]', '["amenity"="fast_food"]'],
    ],
    [/academia/, ['["leisure"="fitness_centre"]']],
    [/clinica/, ['["amenity"="clinic"]', '["healthcare"="clinic"]']],
    [/psicolog/, ['["healthcare"="psychotherapist"]']],
    [/fisioter/, ['["healthcare"="physiotherapist"]']],
    [/nutric/, ['["healthcare"="dietitian"]']],
    [/advog/, ['["office"="lawyer"]']],
    [/barbear|salao/, ['["shop"="hairdresser"]']],
    [/estetic/, ['["shop"="beauty"]']],
    [/pet shop/, ['["shop"="pet"]']],
    [/veterin/, ['["amenity"="veterinary"]']],
    [/oficina|autoeletr/, ['["shop"="car_repair"]']],
    [/roupa/, ['["shop"="clothes"]']],
    [/imobil/, ['["office"="estate_agent"]']],
    [/escola|curso/, ['["amenity"="school"]', '["amenity"="language_school"]']],
    [/hotel|pousada/, ['["tourism"="hotel"]', '["tourism"="guest_house"]']],
    [/contabil/, ['["office"="accountant"]']],
    [/assistenc/, ['["shop"="electronics_repair"]']],
    [/mercado/, ['["shop"="supermarket"]', '["shop"="convenience"]']],
    [/farmacia/, ['["amenity"="pharmacy"]']],
    [/construc/, ['["office"="construction_company"]']],
  ];
  return (
    map.find(([re]) => re.test(n))?.[1] ?? [
      `["name"~${JSON.stringify(n.replace(/[^a-z0-9 ]/g, ""))},i]`,
    ]
  );
}
export class OpenStreetMapProvider implements LeadProviderInterface {
  id = "osm" as const;
  getCoordinates = geocode;
  async searchBusinesses(f: SearchFilters, center: Coordinates) {
    const area = f.bounds
      ? `(${f.bounds.join(",")})`
      : `(around:${Math.round(f.radius * 1000)},${center.latitude},${center.longitude})`;
    const q = `[out:json][timeout:25][maxsize:33554432];(${osmSelectors(
      f.category,
    )
      .map((s) => `nwr${s}${area};`)
      .join("")});out center 250;`;
    const endpoint =
      runtime().OVERPASS_URL ||
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter";
    const identity = providerUserAgent(
      runtime().APP_ORIGIN,
      runtime().NOMINATIM_CONTACT,
    );
    const leaseKey = `overpass_lease_${stableHash(endpoint)}`;
    const leaseToken = JSON.stringify(crypto.randomUUID());
    // One in-flight query per configured endpoint across all workspaces/serverless instances.
    // A crashed request releases itself after 45 seconds; no schema change needed.
    const lease = await row<{ key: string }>(
      "INSERT INTO caches (key,organization_id,value_json,expires_at) VALUES (?,NULL,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,expires_at=excluded.expires_at WHERE caches.expires_at<=? RETURNING key",
      leaseKey,
      leaseToken,
      Date.now() + 45000,
      Date.now(),
    );
    if (!lease)
      throw new AppError(
        "PROVIDER_BUSY",
        "Uma pesquisa na fonte está em andamento. Tente novamente em instantes.",
        429,
        5,
      );
    let data: z.infer<typeof responseSchema>;
    try {
      await rateLimit(`overpass_global_${stableHash(endpoint)}`, 1, 10);
      data = parseProviderData(
        responseSchema,
        await fetchJson(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              Accept: "application/json",
              "User-Agent": identity,
            },
            body: new URLSearchParams({ data: q }).toString(),
          },
          30000,
          true,
        ),
      );
    } finally {
      await run(
        "DELETE FROM caches WHERE key=? AND value_json=?",
        leaseKey,
        leaseToken,
      );
    }
    const businesses = (data.elements ?? [])
      .filter(
        (e) =>
          e.tags?.name &&
          ((e.lat !== undefined && e.lon !== undefined) || e.center),
      )
      .map((e) => this.normalizeBusiness(e, f, center));
    return {
      businesses,
      partial: !!data.remark || (data.elements ?? []).length >= 250,
      warnings: [
        "OpenStreetMap pode ter cobertura incompleta e não fornece avaliações. Campo website ausente não confirma ausência de site.",
        ...(data.remark
          ? ["A fonte retornou um resultado parcial. Reduza o raio."]
          : []),
      ],
      license: "OpenStreetMap contributors · ODbL 1.0",
    };
  }
  normalizeBusiness(value: unknown, f: SearchFilters, center: Coordinates) {
    const e = parseProviderData(elementSchema, value);
    const t = e.tags ?? {};
    const raw: RawBusiness = {
      external_id: `${e.type}/${e.id}`,
      name: t.name,
      category: f.category,
      address: [t["addr:street"], t["addr:housenumber"], t["addr:suburb"]]
        .filter(Boolean)
        .join(", "),
      city: t["addr:city"],
      state: t["addr:state"],
      neighborhood: t["addr:suburb"],
      postal_code: t["addr:postcode"],
      latitude: e.lat ?? e.center!.lat,
      longitude: e.lon ?? e.center!.lon,
      phone: t["contact:phone"] || t.phone,
      whatsapp: t["contact:whatsapp"],
      website: t["contact:website"] || t.website,
      instagram: t["contact:instagram"],
      facebook: t["contact:facebook"],
      hours: t.opening_hours,
      source_url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      can_persist: true,
      can_export: true,
    };
    return normalizeBusiness(raw, f, center, this.id);
  }
  async getBusinessDetails(b: Business) {
    return b;
  }
  async verifyWebsite(b: Business) {
    return b.digital_presence;
  }
  async enrichBusiness(b: Business) {
    return { ...b, last_checked_at: new Date().toISOString() };
  }
}
