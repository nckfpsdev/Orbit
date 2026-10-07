import type { DigitalPresence, Evidence, WebsiteStatus } from "./types";
import { normalizeText } from "./geo";
const socialHosts = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "x.com",
  "twitter.com",
];
const aggregators = [
  "linktr.ee",
  "bio.site",
  "beacons.ai",
  "campsite.bio",
  "bit.ly",
];
const directories = [
  "google.com",
  "maps.google.com",
  "business.site",
  "ifood.com.br",
  "tripadvisor.com",
  "tripadvisor.com.br",
  "doctoralia.com.br",
  "jusbrasil.com.br",
  "yelp.com",
  "wa.me",
  "api.whatsapp.com",
];
export function publicUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u
      : null;
  } catch {
    return null;
  }
}
function matches(host: string, list: string[]) {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}
export function classifyUrl(value: string | null | undefined): WebsiteStatus {
  const u = publicUrl(value);
  if (!u) return value ? "inconclusive" : "not_identified";
  const h = u.hostname.toLowerCase().replace(/^www\./, "");
  if (matches(h, socialHosts)) return "social_only";
  if (matches(h, aggregators)) return "aggregator";
  if (matches(h, directories)) return "directory";
  return "own_website";
}
export function domainMatchesBusiness(name: string, website: string | null) {
  const host =
    publicUrl(website)
      ?.hostname.toLowerCase()
      .replace(/^www\./, "") ?? "";
  const generic = new Set([
    "clinica",
    "odontologica",
    "odonto",
    "restaurante",
    "academia",
    "barbearia",
    "hotel",
    "pousada",
    "ltda",
    "servicos",
    "comercio",
  ]);
  const tokens = normalizeText(name)
    .split(" ")
    .filter((w) => w.length >= 3 && !generic.has(w));
  return tokens.some((word) => host.includes(word));
}
export function buildPresence(input: {
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  source: string;
  checked_at: string;
  business_name?: string;
  ownership?: DigitalPresence["ownership"];
  secondary_checked?: boolean;
}): DigitalPresence {
  const evidence = <T>(value: T, confidence: number): Evidence<T> => ({
    value,
    source: input.source,
    confidence,
    last_checked_at: input.checked_at,
  });
  let status = classifyUrl(input.website);
  const ownership =
    input.ownership ??
    (input.business_name &&
    status === "own_website" &&
    domainMatchesBusiness(input.business_name, input.website)
      ? "probable"
      : "unverified");
  if (
    status === "own_website" &&
    input.business_name &&
    ownership === "unverified"
  )
    status = "inconclusive";
  if (!input.website && (input.instagram || input.facebook))
    status = "social_only";
  const confidence = input.website
    ? 0.86
    : input.secondary_checked
      ? 0.82
      : 0.45;
  const explanation =
    status === "own_website"
      ? "Um domínio candidato corresponde ao nome comercial. A associação é provável e ainda requer confirmação independente."
      : status === "inconclusive"
        ? "Um domínio candidato está presente, mas sua associação com o negócio não foi confirmada. A análise de site próprio é inconclusiva."
        : "Nenhum site próprio foi identificado nas fontes analisadas. Isso não confirma que a empresa não tenha um site.";
  return {
    status,
    website: evidence(
      input.website,
      status === "inconclusive" ? 0.35 : confidence,
    ),
    instagram: evidence(input.instagram, input.instagram ? 0.9 : 0.35),
    facebook: evidence(input.facebook, input.facebook ? 0.9 : 0.35),
    whatsapp: evidence(input.whatsapp, input.whatsapp ? 0.9 : 0.35),
    ownership,
    sources_checked: [input.source],
    explanation,
    checks: [
      {
        label: "Campo website",
        result: input.website ? "found" : "missing",
        detail: input.website ?? "Campo ausente na fonte consultada",
      },
      {
        label: "Domínio próprio",
        result: status === "own_website" ? "found" : "unknown",
        detail:
          status === "own_website"
            ? "Domínio candidato; associação precisa ser confirmada"
            : input.website
              ? "Vínculo com o negócio não confirmado"
              : "Ausência de domínio não comprova ausência de site",
      },
      {
        label: "Nome e domínio",
        result:
          ownership === "probable" || ownership === "confirmed"
            ? "found"
            : "unknown",
        detail:
          ownership === "probable"
            ? "Correspondência lexical encontrada; não prova titularidade"
            : ownership === "confirmed"
              ? "Associação confirmada por fonte autorizada"
              : "Não foi possível associar o domínio ao nome",
      },
      {
        label: "Redes sociais",
        result: input.instagram || input.facebook ? "found" : "unknown",
        detail:
          input.instagram || input.facebook || "Não identificadas nesta fonte",
      },
      {
        label: "Verificação independente",
        result: input.secondary_checked ? "found" : "unknown",
        detail: input.secondary_checked
          ? "Evidências complementares consultadas"
          : "Ainda não executada",
      },
    ],
  };
}
export function safeExternalUrl(
  value: string | null | undefined,
): string | undefined {
  const u = publicUrl(value);
  return u?.href;
}
