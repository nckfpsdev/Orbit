import type {
  SearchFilters,
  SearchResponse,
  Business,
} from "@/lib/domain/types";
import { provider } from "@/lib/providers";
import {
  dedupeBusinesses,
  areDuplicates,
  mergeBusinesses,
} from "@/lib/domain/dedupe";
import { filterBusinesses } from "@/lib/domain/filters";
import { distanceKm, stableHash } from "@/lib/domain/geo";
import { scoreBusiness } from "@/lib/domain/scoring";
import { batch, id, now, row, run, rows, runtime } from "./db";
import { demoEnabled, businessVisibility } from "./environment";
import { rateLimit, audit, AppError, type Context } from "./security";
import { withCredits } from "./credits";
import {
  getBusinesses,
  getBusinessesByIds,
  getSourceCandidates,
  saveBusinesses,
} from "./store";
export async function searchBusinesses(
  c: Context,
  f: SearchFilters,
): Promise<SearchResponse> {
  await rateLimit(`${c.orgId}:search`, 12, 60);
  if (f.provider === "osm" && f.radius > 20)
    throw new AppError(
      "RADIUS_LIMIT",
      "Para OpenStreetMap, use um raio de até 20 km para controlar o custo da consulta.",
      422,
    );
  const p = provider(f.provider);
  const center = await p.getCoordinates(f);
  const cacheKey = `${c.orgId}:search:${stableHash(JSON.stringify({ provider: f.provider, city: f.city, state: f.state, neighborhood: f.neighborhood, category: f.category, cep: f.postal_code, radius: f.radius, bounds: f.bounds }))}`;
  const cache = await row<{ value_json: string }>(
    "SELECT value_json FROM caches WHERE key=? AND organization_id=? AND expires_at>?",
    cacheKey,
    c.orgId,
    Date.now(),
  );
  const perform = async (): Promise<SearchResponse> => {
    let businesses: Business[];
    let warnings: string[];
    let partial = false;
    let creditsUsed = 0;
    if (cache) {
      const data = JSON.parse(cache.value_json);
      businesses = data.businesses;
      warnings = data.warnings;
      partial = data.partial;
    } else {
      if (f.provider !== "mock")
        await rateLimit(
          "search_global_daily",
          Number(runtime().GLOBAL_SEARCH_DAILY_LIMIT || 1000),
          86400,
        );
      const start = Date.now();
      const response = await p.searchBusinesses(f, center);
      if (response.businesses.some((b) => !b.can_persist))
        throw new AppError(
          "LICENSE_RESTRICTION",
          "O contrato desta fonte não autoriza salvar os resultados.",
          403,
        );
      businesses = dedupeBusinesses(response.businesses);
      warnings = response.warnings;
      partial = response.partial;
      creditsUsed = c.settings.credit_costs.search;
      if (f.provider !== "licensed")
        await run(
          "INSERT INTO caches (key,organization_id,value_json,expires_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,expires_at=excluded.expires_at",
          cacheKey,
          c.orgId,
          JSON.stringify({ businesses, warnings, partial }),
          Date.now() + 15 * 60000,
        );
      await run(
        "INSERT INTO provider_usage (id,organization_id,provider,operation,units,estimated_cost,duration_ms,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        id("usage"),
        c.orgId,
        f.provider,
        "search",
        1,
        c.settings.unit_costs[f.provider] || null,
        Date.now() - start,
        "success",
        now(),
      );
    }
    const existing = [
      ...(await getSourceCandidates(
        c,
        f.provider,
        businesses.map((b) => String(b.fields.external_id?.value ?? b.id)),
      )),
      ...(await getBusinesses(c)),
    ];
    businesses = businesses.map((b) => {
      const duplicate = existing.find(
        (old) =>
          areDuplicates(old, b) ||
          old.id === `${c.orgId}_${b.id}` ||
          (old.source === b.source &&
            !!b.fields.external_id?.value &&
            old.fields.external_id?.value === b.fields.external_id?.value),
      );
      const current = {
        ...(duplicate ? mergeBusinesses(duplicate, b) : b),
        id: duplicate?.id ?? b.id,
        created_at: duplicate?.created_at ?? b.created_at,
        distance_km: distanceKm(b, center),
      };
      const score = scoreBusiness(current, c.settings.score_weights);
      return {
        ...current,
        lead_score: score.score,
        score_reasons: score.reasons,
      };
    });
    businesses = await saveBusinesses(c, businesses);
    const saved = await getBusinessesByIds(
      c,
      businesses.map((b) => b.id),
    );
    const byId = new Map(saved.map((b) => [b.id, b]));
    businesses = businesses.map((b) => ({
      ...b,
      ...byId.get(b.id),
      distance_km: b.distance_km,
    }));
    const filtered = filterBusinesses(businesses, f);
    const searchId = id("search");
    await run(
      "INSERT INTO searches (id,organization_id,name,filters_json,center_json,provider,result_count,cached,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      searchId,
      c.orgId,
      `${f.city} / ${f.category} / ${f.website_filter === "all" ? "Todos" : "Presença digital"}`,
      JSON.stringify(f),
      JSON.stringify(center),
      f.provider,
      filtered.length,
      !!cache,
      partial ? "partial" : "complete",
      now(),
    );
    for (let i = 0; i < filtered.length; i += 40)
      await batch(
        filtered.slice(i, i + 40).map((b, j) => ({
          sql: "INSERT INTO search_results (id,organization_id,search_id,business_id,position) VALUES (?,?,?,?,?)",
          args: [id("result"), c.orgId, searchId, b.id, i + j],
        })),
      );
    await audit(
      c,
      "search.run",
      searchId,
      `${f.provider} · ${filtered.length} resultados`,
    );
    return {
      id: searchId,
      businesses: filtered,
      total: filtered.length,
      page: 1,
      page_size: 250,
      center,
      filters: f,
      cached: !!cache,
      partial,
      warnings,
      is_demo: f.provider === "mock",
      credits_used: creditsUsed,
    };
  };
  return cache ? perform() : (await withCredits(c, "search", perform)).result;
}
export async function getSearch(
  c: Context,
  searchId: string,
  page = 1,
  pageSize = 250,
): Promise<SearchResponse> {
  const r = await row<{
    id: string;
    filters_json: string;
    center_json: string;
    result_count: number;
    cached: boolean;
    status: string;
    provider: string;
  }>(
    "SELECT * FROM searches WHERE id=? AND organization_id=?",
    searchId,
    c.orgId,
  );
  if (!r || (r.provider === "mock" && !demoEnabled()))
    throw new AppError("NOT_FOUND", "Pesquisa não encontrada.", 404);
  const limit = Math.min(250, Math.max(1, pageSize));
  const records = await rows<{
    data_json: string;
    saved_id: string | null;
    stage: string | null;
    notes: string | null;
    tags_json: string | null;
    list_id: string | null;
  }>(
    `SELECT b.data_json,l.id as saved_id,l.stage,l.notes,l.tags_json,l.list_id FROM search_results s JOIN businesses b ON b.id=s.business_id LEFT JOIN leads l ON l.business_id=b.id AND l.organization_id=b.organization_id WHERE s.search_id=? AND b.organization_id=? AND ${businessVisibility()} ORDER BY s.position LIMIT ? OFFSET ?`,
    searchId,
    c.orgId,
    limit,
    (page - 1) * limit,
  );
  const businesses = records.map((x) => ({
    ...(JSON.parse(x.data_json) as Business),
    saved: !!x.saved_id,
    lead_status: x.stage ?? "Descoberto",
    notes: x.notes ?? "",
    tags: x.tags_json ? JSON.parse(x.tags_json) : [],
    list_id: x.list_id,
  }));
  return {
    id: r.id,
    businesses,
    total: r.result_count,
    page,
    page_size: limit,
    center: JSON.parse(r.center_json),
    filters: JSON.parse(r.filters_json),
    cached: !!r.cached,
    partial: r.status === "partial",
    warnings: [],
    is_demo: r.provider === "mock",
    credits_used: 0,
  };
}
