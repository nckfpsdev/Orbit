import { normalizeText } from "./geo";
import { z } from "zod";

export const STATE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};
export interface GeoAddress {
  country_code?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  "ISO3166-2-lvl4"?: string;
}
export const postalResponseSchema = z.union([
  z.object({ erro: z.literal(true) }),
  z.object({
    localidade: z.string().trim().min(1).max(180),
    uf: z.string().refine((value) => value in STATE_NAMES),
    bairro: z.string().max(180).default(""),
    logradouro: z.string().max(300).default(""),
  }),
]);
const coordinate = (maximum: number) =>
  z
    .union([z.number(), z.string().trim().min(1)])
    .transform(Number)
    .refine((value) => Number.isFinite(value) && Math.abs(value) <= maximum);
export const geocodingResponseSchema = z
  .array(
    z.object({
      lat: coordinate(90),
      lon: coordinate(180),
      display_name: z.string().max(1000),
      address: z
        .object({
          country_code: z.string().max(3).optional(),
          state: z.string().max(180).optional(),
          city: z.string().max(180).optional(),
          town: z.string().max(180).optional(),
          village: z.string().max(180).optional(),
          municipality: z.string().max(180).optional(),
          "ISO3166-2-lvl4": z.string().max(12).optional(),
        })
        .optional(),
    }),
  )
  .max(10);
export function locationMatches(
  address: GeoAddress | undefined,
  city: string,
  state: string,
) {
  if (!address || address.country_code !== "br") return false;
  const sameState =
    address["ISO3166-2-lvl4"] === `BR-${state}` ||
    normalizeText(address.state ?? "") ===
      normalizeText(STATE_NAMES[state] ?? state);
  const cities = [
    address.city,
    address.town,
    address.village,
    address.municipality,
  ].filter((v): v is string => !!v);
  return (
    sameState && cities.some((v) => normalizeText(v) === normalizeText(city))
  );
}
