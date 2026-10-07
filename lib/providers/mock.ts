import type { Business, SearchFilters } from "@/lib/domain/types";
import type {
  Coordinates,
  LeadProviderInterface,
  RawBusiness,
} from "./contracts";
import { normalizeBusiness } from "./normalize";
import { normalizeText, stableHash } from "@/lib/domain/geo";
import { AppError } from "@/lib/domain/errors";
const CITIES: Record<string, [number, number, string]> = {
  fortaleza: [-3.735, -38.507, "CE"],
  "sao paulo": [-23.5505, -46.6333, "SP"],
  "rio de janeiro": [-22.9068, -43.1729, "RJ"],
  recife: [-8.0476, -34.877, "PE"],
  salvador: [-12.9777, -38.5016, "BA"],
  "belo horizonte": [-19.9167, -43.9345, "MG"],
  curitiba: [-25.4284, -49.2733, "PR"],
  brasilia: [-15.7939, -47.8828, "DF"],
  caucaia: [-3.736, -38.654, "CE"],
  maracanau: [-3.876, -38.626, "CE"],
};
const NAMES = [
  "Aurora",
  "Viva",
  "Essência",
  "Horizonte",
  "Alameda",
  "Lumi",
  "Bem Viver",
  "Áurea",
  "Origens",
  "Novo Tempo",
  "Solare",
  "Nativa",
  "Reserva",
  "Plural",
  "Oásis",
  "Harmonia",
  "Elo",
  "Maré",
  "Ponto Alto",
  "Ateliê",
  "Estação",
  "Vista",
  "Forma",
  "Universo",
];
function prefix(category: string) {
  const n = normalizeText(category);
  if (/odont/.test(n)) return "Odonto";
  if (/clinica/.test(n)) return "Clínica";
  if (/academia/.test(n)) return "Academia";
  if (/restaurante|pizzar|hamburg/.test(n)) return "Restaurante";
  if (/barbear/.test(n)) return "Barbearia";
  return category.replace(/s$/, "");
}
export function fixtureBusinesses(
  f: SearchFilters,
  center: Coordinates,
): Business[] {
  return NAMES.map((name, i) => {
    const seed = stableHash(`${f.city}-${f.category}`);
    const angle = (i * 137.5 * Math.PI) / 180;
    const radius = 0.65 + (i % 7) * 0.52;
    const raw: RawBusiness = {
      external_id: `${seed}_${i}`,
      name: `${prefix(f.category)} ${name}`,
      category: f.category,
      address: `${i % 2 ? "Rua das Palmeiras" : "Avenida Horizonte"}, ${120 + i * 47} — ${["Aldeota", "Meireles", "Centro", "Cocó", "Varjota"][i % 5]}`,
      city: f.city,
      neighborhood: ["Aldeota", "Meireles", "Centro", "Cocó", "Varjota"][i % 5],
      postal_code: f.postal_code || "60160-230",
      latitude: center.latitude + (Math.sin(angle) * radius) / 111.2,
      longitude:
        center.longitude +
        (Math.cos(angle) * radius) /
          (111.2 * Math.cos((center.latitude * Math.PI) / 180)),
      phone:
        i % 6 === 5 ? null : `(85) 0000-${String(1000 + i).padStart(4, "0")}`,
      whatsapp:
        i % 4 === 3 ? null : `558500000${String(1000 + i).padStart(4, "0")}`,
      website:
        i % 6 === 4
          ? `https://${name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f ]/g, "")}.example`
          : i % 6 === 3
            ? `https://linktr.ee/orbit_ficticio_${i}`
            : null,
      instagram:
        i % 5 === 4 ? null : `https://www.instagram.com/orbit.ficticio.${i}/`,
      facebook:
        i % 7 === 0 ? `https://www.facebook.com/orbit.ficticio.${i}` : null,
      rating: Number((4.4 + (i % 6) * 0.1).toFixed(1)),
      reviews_count: [293, 438, 127, 82, 34, 208, 164, 319][i % 8],
      hours: "Seg–sex, 8h–18h · Sáb, 8h–12h",
      services: /odont|clínica/i.test(f.category)
        ? ["Atendimento inicial", "Avaliação e orientação", "Acompanhamento"]
        : /academia/i.test(f.category)
          ? ["Musculação", "Treinamento funcional", "Aula experimental"]
          : /restaurante|pizz/i.test(f.category)
            ? ["Cardápio", "Reservas", "Pedidos"]
            : ["Atendimento personalizado", "Conheça nossos serviços"],
      source_url: "",
      can_persist: true,
      can_export: true,
    };
    const b = normalizeBusiness(raw, f, center, "mock");
    b.digital_presence.website.confidence = 0.82;
    b.digital_presence.sources_checked = [
      "Fixture de desenvolvimento · fonte A",
      "Fixture de desenvolvimento · fonte B",
    ];
    return b;
  });
}
export class MockProvider implements LeadProviderInterface {
  id = "mock" as const;
  async getCoordinates(f: SearchFilters): Promise<Coordinates> {
    const city = CITIES[normalizeText(f.city)];
    if (!city || city[2] !== f.state)
      throw new AppError(
        "DEMO_LOCATION",
        "A demonstração cobre Fortaleza, Caucaia, Maracanaú, São Paulo, Rio de Janeiro, Recife, Salvador, Belo Horizonte, Curitiba e Brasília. Selecione OpenStreetMap para outras cidades.",
        422,
      );
    return {
      latitude: city[0],
      longitude: city[1],
      label: `${f.city} · ${f.state}`,
      source: "Coordenadas ilustrativas de desenvolvimento",
    };
  }
  async searchBusinesses(f: SearchFilters, center: Coordinates) {
    return {
      businesses: fixtureBusinesses(f, center),
      partial: false,
      warnings: [
        "Todos os estabelecimentos, contatos e avaliações desta busca são fictícios.",
      ],
      license: "Fixture de desenvolvimento",
    };
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
  normalizeBusiness(value: unknown, f: SearchFilters, center: Coordinates) {
    return normalizeBusiness(value as RawBusiness, f, center, this.id);
  }
}
