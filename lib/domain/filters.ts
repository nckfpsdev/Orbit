import type { Business, SearchFilters } from "./types";
import { inBounds, normalizeText } from "./geo";
export function filterBusinesses(items: Business[], f: SearchFilters) {
  const noOwn = ["not_identified", "social_only", "aggregator", "directory"];
  const result = items.filter((b) => {
    if (f.bounds && !inBounds(b.latitude, b.longitude, f.bounds)) return false;
    if (!f.bounds && b.distance_km > f.radius) return false;
    if (
      f.neighborhood &&
      !normalizeText(b.neighborhood).includes(normalizeText(f.neighborhood))
    )
      return false;
    if (
      f.sub_category &&
      !normalizeText(b.sub_category).includes(normalizeText(f.sub_category))
    )
      return false;
    if (f.website_filter === "no_own" && !noOwn.includes(b.website_status))
      return false;
    if (f.website_filter === "none" && b.website_status !== "not_identified")
      return false;
    if (
      f.website_filter === "instagram" &&
      (!b.instagram || b.website_status === "own_website")
    )
      return false;
    if (
      f.website_filter === "facebook" &&
      (!b.facebook || b.website_status === "own_website")
    )
      return false;
    if (
      [
        "own_website",
        "unavailable",
        "needs_improvement",
        "inconclusive",
        "aggregator",
        "directory",
      ].includes(f.website_filter) &&
      b.website_status !== f.website_filter
    )
      return false;
    if ((f.has_phone && !b.phone) || (f.has_whatsapp && !b.public_whatsapp))
      return false;
    if (
      (f.min_rating && (b.rating ?? 0) < f.min_rating) ||
      (f.min_reviews && (b.reviews_count ?? 0) < f.min_reviews) ||
      b.lead_score < f.min_score
    )
      return false;
    if (f.crm_status !== "all" && (!b.saved || b.lead_status !== f.crm_status))
      return false;
    return true;
  });
  return result.sort((a, b) => {
    if (f.prioritize_no_site || f.sort === "no_site") {
      const delta =
        Number(noOwn.includes(b.website_status)) -
        Number(noOwn.includes(a.website_status));
      if (delta) return delta;
    }
    if (f.sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (f.sort === "reviews")
      return (b.reviews_count ?? 0) - (a.reviews_count ?? 0);
    if (f.sort === "distance") return a.distance_km - b.distance_km;
    if (f.sort === "recent") return b.created_at.localeCompare(a.created_at);
    if (f.sort === "score_asc") return a.lead_score - b.lead_score;
    return b.lead_score - a.lead_score;
  });
}
export function parseNaturalSearch(
  text: string,
  base: SearchFilters,
): { filters: SearchFilters; interpreted: string[]; unresolved: string[] } {
  const n = normalizeText(text);
  const f = { ...base, query: text };
  const interpreted: string[] = [];
  const radius = n.match(/(?:raio de|raio|ate)\s*(\d+(?:[.,]\d+)?)\s*km/);
  if (radius) {
    f.radius = Math.min(50, Math.max(1, Number(radius[1].replace(",", "."))));
    interpreted.push(`Raio: ${f.radius} km`);
  }
  const reviews = n.match(
    /(?:mais de|minimo|pelo menos|acima de)\s*(\d+)\s*avali/,
  );
  if (reviews) {
    f.min_reviews = Number(reviews[1]);
    interpreted.push(`Mín. ${f.min_reviews} avaliações`);
  }
  const score = n.match(
    /(?:score|leads|oportunidade)(?:\s+acima de|\s+maior que|\s+minimo)?\s*(\d+)/,
  );
  if (score) {
    f.min_score = Math.min(100, Number(score[1]));
    interpreted.push(`Score ≥ ${f.min_score}`);
  }
  if (/sem site|nao possu.*site/.test(n)) {
    f.website_filter = "no_own";
    f.prioritize_no_site = true;
    interpreted.push("Sem site próprio identificado");
  }
  const names: [RegExp, string][] = [
    [/academia/, "Academias"],
    [/odont|dentista/, "Clínicas odontológicas"],
    [/clinica/, "Clínicas"],
    [/restaurante/, "Restaurantes"],
    [/barbear/, "Barbearias"],
    [/advog/, "Advogados"],
    [/pizzar/, "Pizzarias"],
    [/pet shop/, "Pet shops"],
    [/imobil/, "Imobiliárias"],
  ];
  const match = names.find(([re]) => re.test(n));
  if (match) {
    f.category = match[1];
    interpreted.push(match[1]);
  }
  const cities: [string, string][] = [
    ["fortaleza", "CE"],
    ["sao paulo", "SP"],
    ["rio de janeiro", "RJ"],
    ["recife", "PE"],
    ["salvador", "BA"],
    ["belo horizonte", "MG"],
    ["curitiba", "PR"],
    ["brasilia", "DF"],
  ];
  const city = cities.find(([name]) => n.includes(name));
  if (city) {
    f.city = city[0]
      .split(" ")
      .map((v) => v[0].toUpperCase() + v.slice(1))
      .join(" ");
    f.state = city[1];
    interpreted.push(`${f.city} · ${f.state}`);
  }
  if (/whatsapp/.test(n)) {
    f.has_whatsapp = true;
    interpreted.push("WhatsApp disponível");
  }
  if (/centro/.test(n)) {
    f.neighborhood = "Centro";
    interpreted.push("Bairro: Centro");
  }
  return {
    filters: f,
    interpreted,
    unresolved: interpreted.length
      ? []
      : [
          "Não interpretei filtros. Revise localização e nicho antes de pesquisar.",
        ],
  };
}
