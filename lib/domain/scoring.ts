import type { Business } from "./types";
import { DEFAULT_SETTINGS } from "./constants";
export function scoreBusiness(
  b: Business,
  weights: Record<string, number> = DEFAULT_SETTINGS.score_weights,
) {
  const reasons: { label: string; points: number }[] = [];
  const add = (key: string, label: string, mult = 1) => {
    const remaining = 100 - reasons.reduce((s, r) => s + r.points, 0);
    const points = Math.min(
      remaining,
      Math.round(
        Math.max(0, Number.isFinite(weights[key]) ? weights[key] : 0) * mult,
      ),
    );
    if (points) reasons.push({ label, points });
  };
  if (
    ["not_identified", "social_only", "directory", "aggregator"].includes(
      b.website_status,
    )
  )
    add(
      "gap",
      "Nenhum site próprio identificado",
      b.digital_presence.website.confidence >= 0.75 ? 1 : 0.7,
    );
  else if (["unavailable", "needs_improvement"].includes(b.website_status))
    add("gap", "Pontos de melhoria verificados no site", 0.65);
  if (
    typeof b.reviews_count === "number" &&
    Number.isFinite(b.reviews_count) &&
    b.reviews_count > 0
  )
    add(
      "reviews",
      `${b.reviews_count} avaliações registradas`,
      b.reviews_count >= 200
        ? 1
        : b.reviews_count >= 50
          ? 0.75
          : b.reviews_count >= 10
            ? 0.4
            : 0.15,
    );
  if (
    typeof b.rating === "number" &&
    Number.isFinite(b.rating) &&
    b.rating >= 0 &&
    b.rating <= 5
  )
    add(
      "rating",
      `Nota ${b.rating.toFixed(1).replace(".", ",")} na fonte`,
      b.rating >= 4.7 ? 1 : b.rating >= 4.3 ? 0.75 : b.rating >= 4 ? 0.4 : 0.15,
    );
  if (b.public_whatsapp) add("whatsapp", "WhatsApp comercial identificado");
  if (b.instagram || b.facebook) add("social", "Rede social identificada");
  const complete =
    [b.address, b.phone, b.opening_hours].filter(Boolean).length / 3;
  add("complete", "Dados comerciais disponíveis", complete);
  if (
    /clinica|odont|academia|imobil|advog|constru|contabil/i.test(
      b.category.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    )
  )
    add("segment", "Prioridade comercial configurada para o nicho");
  if (b.recent_activity === true)
    add("activity", "Atividade recente verificada");
  return {
    score: Math.min(
      100,
      reasons.reduce((s, r) => s + r.points, 0),
    ),
    reasons,
  };
}
export function scoreLabel(score: number) {
  return score >= 80
    ? "Muito alta"
    : score >= 65
      ? "Alta"
      : score >= 40
        ? "Média"
        : "Baixa";
}
