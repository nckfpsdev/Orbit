import { createHash } from "node:crypto";
import type { Business, ProviderId, SearchFilters } from "@/lib/domain/types";
import type { Coordinates, RawBusiness } from "./contracts";
import { buildPresence } from "@/lib/domain/presence";
import { distanceKm } from "@/lib/domain/geo";
import { scoreBusiness } from "@/lib/domain/scoring";
export function normalizeBusiness(
  raw: RawBusiness,
  f: SearchFilters,
  center: Coordinates,
  source: ProviderId,
): Business {
  const date = new Date().toISOString();
  const presence = buildPresence({
    business_name: raw.name,
    website: raw.website ?? null,
    instagram: raw.instagram ?? null,
    facebook: raw.facebook ?? null,
    whatsapp: raw.whatsapp ?? null,
    source:
      source === "mock"
        ? "Dados fictícios · Orbit"
        : source === "osm"
          ? "OpenStreetMap · ODbL"
          : "Provedor licenciado",
    checked_at: date,
  });
  const b: Business = {
    id: `${source}_${createHash("sha256").update(raw.external_id).digest("hex")}`,
    business_name: raw.name,
    category: raw.category ?? f.category,
    sub_category: raw.category ?? f.category,
    country: f.country,
    state: raw.state || (f.bounds ? "" : f.state),
    city: raw.city || (f.bounds ? "Área pesquisada" : f.city),
    neighborhood: raw.neighborhood ?? "",
    postal_code: raw.postal_code ?? "",
    address: raw.address ?? "",
    latitude: raw.latitude,
    longitude: raw.longitude,
    phone: raw.phone ?? null,
    public_whatsapp: raw.whatsapp ?? null,
    website: raw.website ?? null,
    website_status: presence.status,
    instagram: raw.instagram ?? null,
    facebook: raw.facebook ?? null,
    rating: raw.rating ?? null,
    reviews_count: raw.reviews_count ?? null,
    opening_hours: raw.hours ?? null,
    services: raw.services ?? [],
    photos: [],
    recent_activity: null,
    lead_score: 0,
    score_reasons: [],
    source,
    source_url: raw.source_url ?? "",
    is_demo: source === "mock",
    can_export: source !== "licensed" || raw.can_export === true,
    can_persist: source !== "licensed" || raw.can_persist === true,
    fields: {},
    digital_presence: presence,
    distance_km: Number(distanceKm(raw, center).toFixed(2)),
    created_at: date,
    updated_at: date,
    last_checked_at: null,
    saved: false,
    lead_status: "Descoberto",
    tags: [],
    notes: "",
    list_id: null,
  };
  for (const [key, value] of Object.entries(raw))
    b.fields[key] = {
      value,
      source: presence.website.source,
      confidence: value === null || value === undefined ? 0.25 : 0.9,
      last_checked_at: date,
    };
  const score = scoreBusiness(b);
  b.lead_score = score.score;
  b.score_reasons = score.reasons;
  return b;
}
