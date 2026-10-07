import { z } from "zod";
import type { Business, SearchFilters } from "@/lib/domain/types";
import type {
  Coordinates,
  LeadProviderInterface,
  RawBusiness,
} from "./contracts";
import { normalizeBusiness } from "./normalize";
import { fetchJson, geocode } from "./geocoding";
import { runtime } from "@/lib/server/db";
import { AppError } from "@/lib/server/security";
import { parseProviderData } from "./validation";
const rawSchema = z.object({
  external_id: z.string().max(180),
  name: z.string().min(2).max(180),
  category: z.string().max(180).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(180).optional(),
  state: z.string().max(60).optional(),
  neighborhood: z.string().max(180).optional(),
  postal_code: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().max(50).nullable().optional(),
  whatsapp: z.string().max(50).nullable().optional(),
  website: z.string().max(1000).nullable().optional(),
  instagram: z.string().max(1000).nullable().optional(),
  facebook: z.string().max(1000).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviews_count: z.number().int().min(0).nullable().optional(),
  hours: z.string().max(180).nullable().optional(),
  services: z.array(z.string().max(180)).max(30).optional(),
  source_url: z.string().url().optional(),
  can_persist: z.literal(true),
  can_export: z.boolean(),
});
export class LicensedProvider implements LeadProviderInterface {
  id = "licensed" as const;
  getCoordinates = geocode;
  private config() {
    const url = runtime().LEAD_PROVIDER_URL;
    const key = runtime().LEAD_PROVIDER_KEY;
    if (!url || !key)
      throw new AppError(
        "PROVIDER_NOT_CONFIGURED",
        "O provedor licenciado ainda não está conectado. Use OpenStreetMap ou a demonstração.",
        503,
      );
    if (!url.startsWith("https://"))
      throw new AppError(
        "PROVIDER_CONFIGURATION",
        "O endpoint do provedor precisa usar HTTPS.",
        503,
      );
    return { url: url.replace(/\/$/, ""), key };
  }
  async searchBusinesses(f: SearchFilters, center: Coordinates) {
    const c = this.config();
    const raw = await fetchJson(`${c.url}/businesses/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: f, center, limit: 100 }),
    });
    const data = parseProviderData(
      z.object({
        businesses: z.array(rawSchema).max(250),
        partial: z.boolean().default(false),
        license: z.string().min(2).max(300),
        warnings: z.array(z.string().max(500)).max(20).default([]),
      }),
      raw,
    );
    return {
      businesses: data.businesses.map((b) =>
        this.normalizeBusiness(b, f, center),
      ),
      partial: data.partial,
      warnings: data.warnings,
      license: data.license,
    };
  }
  normalizeBusiness(value: unknown, f: SearchFilters, center: Coordinates) {
    return normalizeBusiness(
      parseProviderData(rawSchema, value) as RawBusiness,
      f,
      center,
      this.id,
    );
  }
  async getBusinessDetails(b: Business) {
    const c = this.config();
    const raw = await fetchJson(`${c.url}/businesses/details`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ external_id: b.fields.external_id?.value }),
    });
    const f = {
      country: b.country,
      state: b.state,
      city: b.city,
      category: b.category,
    } as SearchFilters;
    return {
      ...this.normalizeBusiness(raw, f, { ...b, label: b.city, source: c.url }),
      id: b.id,
      created_at: b.created_at,
    };
  }
  async verifyWebsite(b: Business) {
    return (await this.getBusinessDetails(b)).digital_presence;
  }
  async enrichBusiness(b: Business) {
    return this.getBusinessDetails(b);
  }
}
