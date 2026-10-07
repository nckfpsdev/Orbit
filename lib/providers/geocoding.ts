import type { SearchFilters } from "@/lib/domain/types";
import type { Coordinates } from "./contracts";
import { runtime, row, run } from "@/lib/server/db";
import { rateLimit, AppError } from "@/lib/server/security";
import { safeProviderEndpoint } from "@/lib/domain/url-policy";
import { boundedText } from "@/lib/server/request-body";
import {
  locationMatches,
  STATE_NAMES,
  postalResponseSchema,
  geocodingResponseSchema,
} from "@/lib/domain/location";
import { parseProviderData } from "./validation";
import { normalizeText, stableHash } from "@/lib/domain/geo";
import { providerUserAgent } from "./identity";
export async function fetchJson(
  url: string,
  init?: RequestInit,
  timeout = 20000,
  retryOnce = false,
): Promise<unknown> {
  if (!safeProviderEndpoint(url))
    throw new AppError(
      "PROVIDER_CONFIGURATION",
      "O endpoint da fonte de dados é inválido.",
      503,
    );
  let response: Response | undefined;
  const deadline = Date.now() + timeout;
  for (let attempt = 0; attempt < (retryOnce ? 2 : 1); attempt++) {
    try {
      response = await fetch(url, {
        ...init,
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
      // Retry only a fast transient gateway/service failure, within the original
      // total budget. Never retry 406, 429, redirects, invalid data or query timeouts.
      if (
        retryOnce &&
        attempt === 0 &&
        [502, 503].includes(response.status) &&
        deadline - Date.now() > 25500
      ) {
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      break;
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "provider_request_failed",
          host: new URL(url).hostname,
          error: error instanceof Error ? error.name : "unknown",
          duration_limit_ms: timeout,
        }),
      );
      if (retryOnce && attempt === 0 && deadline - Date.now() > 25500) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "A fonte de dados não respondeu. Tente novamente ou escolha outra fonte.",
        503,
      );
    }
  }
  if (!response)
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "A fonte de dados não respondeu. Tente novamente.",
      503,
    );
  if (!response.ok)
    console.error(
      JSON.stringify({
        event: "provider_http_failed",
        host: new URL(url).hostname,
        status: response.status,
        duration_ms: timeout - Math.max(0, deadline - Date.now()),
      }),
    );
  if (response.status >= 300 && response.status < 400)
    throw new AppError(
      "PROVIDER_REDIRECT",
      "A fonte redirecionou a solicitação. Confira o endpoint configurado.",
      502,
    );
  if (response.status === 429)
    throw new AppError(
      "PROVIDER_RATE_LIMIT",
      "O provedor atingiu seu limite temporário. Tente novamente mais tarde.",
      429,
      60,
    );
  if (!response.ok)
    throw new AppError(
      "PROVIDER_ERROR",
      "A fonte de dados não conseguiu atender esta solicitação.",
      502,
    );
  try {
    return JSON.parse(await boundedText(response, 2000000)) as unknown;
  } catch {
    throw new AppError(
      "PROVIDER_INVALID_DATA",
      "A fonte retornou dados incompatíveis.",
      502,
    );
  }
}
export async function geocode(f: SearchFilters): Promise<Coordinates> {
  if (f.bounds)
    return {
      latitude: (f.bounds[0] + f.bounds[2]) / 2,
      longitude: (f.bounds[1] + f.bounds[3]) / 2,
      label: `Área visível · ${f.city}`,
      source: "Área selecionada no mapa",
    };
  const key =
    "geo_" +
    stableHash(
      `${f.country}|${f.state}|${f.city}|${f.neighborhood}|${f.postal_code}`,
    );
  const cache = await row<{ value_json: string }>(
    "SELECT value_json FROM caches WHERE key=? AND expires_at>?",
    key,
    Date.now(),
  );
  if (cache) return JSON.parse(cache.value_json);
  await rateLimit("nominatim_global", 1, 2);
  let area = f.neighborhood;
  let city = f.city;
  let state = f.state;
  if (f.postal_code) {
    const cep = parseProviderData(
      postalResponseSchema,
      await fetchJson(
        `https://viacep.com.br/ws/${f.postal_code.replace(/\D/g, "")}/json/`,
      ),
    );
    if ("erro" in cep)
      throw new AppError(
        "NO_LOCATION",
        "CEP não encontrado. Confira os oito dígitos.",
        422,
      );
    if (
      (cep.uf && cep.uf !== f.state) ||
      (cep.localidade &&
        normalizeText(cep.localidade) !== normalizeText(f.city))
    )
      throw new AppError(
        "LOCATION_MISMATCH",
        `Esse CEP pertence a ${cep.localidade} · ${cep.uf}. Ajuste a cidade e o estado.`,
        422,
      );
    area = [cep.logradouro, cep.bairro].filter(Boolean).join(", ");
    city = cep.localidade ?? city;
    state = cep.uf ?? state;
  }
  const base =
    runtime().GEOCODING_URL || "https://nominatim.openstreetmap.org/search";
  const url = new URL(base);
  url.searchParams.set(
    "q",
    [area, city, STATE_NAMES[state] ?? state, f.country]
      .filter(Boolean)
      .join(", "),
  );
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  if (runtime().NOMINATIM_CONTACT)
    url.searchParams.set("email", runtime().NOMINATIM_CONTACT!);
  const data = parseProviderData(
    geocodingResponseSchema,
    await fetchJson(url.href, {
      headers: {
        "User-Agent": providerUserAgent(
          runtime().APP_ORIGIN,
          runtime().NOMINATIM_CONTACT,
        ),
        Accept: "application/json",
        "Accept-Language": "pt-BR",
      },
    }),
  );
  if (
    !Array.isArray(data) ||
    !data[0] ||
    !Number.isFinite(Number(data[0].lat)) ||
    !Number.isFinite(Number(data[0].lon)) ||
    Math.abs(Number(data[0].lat)) > 90 ||
    Math.abs(Number(data[0].lon)) > 180 ||
    !locationMatches(data[0].address, city, state)
  )
    throw new AppError(
      "NO_LOCATION",
      "Localização não encontrada. Revise cidade, bairro ou CEP.",
      422,
    );
  const result = {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
    label: data[0].display_name,
    source: "Geocoding · OpenStreetMap",
  };
  await run(
    "INSERT OR REPLACE INTO caches (key,organization_id,value_json,expires_at) VALUES (?,NULL,?,?)",
    key,
    JSON.stringify(result),
    Date.now() + 30 * 86400000,
  );
  return result;
}
