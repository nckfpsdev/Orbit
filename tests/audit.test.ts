import { test } from "node:test";
import assert from "node:assert/strict";
import {
  locationMatches,
  postalResponseSchema,
  geocodingResponseSchema,
} from "../lib/domain/location";
import {
  safeProviderEndpoint,
  isPublicHostname,
} from "../lib/domain/url-policy";
import { DEFAULT_FILTERS, DEFAULT_SETTINGS } from "../lib/domain/constants";
import { settingsSchema, searchSchema } from "../lib/server/validation";
import { fixtureBusinesses } from "../lib/providers/mock";
import { normalizeBusiness } from "../lib/providers/normalize";
import { scoreBusiness } from "../lib/domain/scoring";
import { buildSiteHtml } from "../lib/domain/site-html";
import { websiteDraft, generateScript } from "../lib/domain/generation";
import { api, ApiError } from "../lib/client/api";
const center = {
  latitude: -3.73,
  longitude: -38.5,
  label: "Fixture",
  source: "test",
};
const business = fixtureBusinesses(DEFAULT_FILTERS, center)[0];
test("external geocoding contracts reject missing CEP and invalid coordinates", () => {
  assert.equal(postalResponseSchema.safeParse({}).success, false);
  assert.equal(postalResponseSchema.safeParse({ erro: true }).success, true);
  assert.equal(
    postalResponseSchema.safeParse({ localidade: "Fortaleza", uf: "XX" })
      .success,
    false,
  );
  for (const lat of [null, true, " ", "NaN", "Infinity", 91])
    assert.equal(
      geocodingResponseSchema.safeParse([
        { lat, lon: -38.5, display_name: "Fortaleza" },
      ]).success,
      false,
    );
  assert.equal(
    geocodingResponseSchema.parse([
      { lat: "-3.73", lon: "-38.5", display_name: "Fortaleza" },
    ])[0].lat,
    -3.73,
  );
});
test("geocoding distinguishes homonymous cities and normalizes accents", () => {
  assert.equal(
    locationMatches(
      {
        country_code: "br",
        state: "Ceará",
        city: " Fortaleza ",
        "ISO3166-2-lvl4": "BR-CE",
      },
      "fortaleza",
      "CE",
    ),
    true,
  );
  assert.equal(
    locationMatches(
      { country_code: "br", state: "São Paulo", city: "São Paulo" },
      "Sao Paulo",
      "SP",
    ),
    true,
  );
  assert.equal(
    locationMatches(
      { country_code: "br", state: "Minas Gerais", town: "Santa Luzia" },
      "Santa Luzia",
      "PB",
    ),
    false,
  );
  assert.equal(locationMatches(undefined, "Fortaleza", "CE"), false);
  assert.equal(
    locationMatches(
      { country_code: "us", state: "Ceará", city: "Fortaleza" },
      "Fortaleza",
      "CE",
    ),
    false,
  );
});
test("URLs of providers require public HTTPS without credentials or extra ports", () => {
  for (const value of [
    "http://api.example.org",
    "https://localhost",
    "https://127.1",
    "https://0x7f000001",
    "https://user:secret@api.example.org",
    "https://api.example.org:8443",
    "https://192.88.99.1",
    "https://169.254.169.254",
  ])
    assert.equal(safeProviderEndpoint(value), null, value);
  assert.ok(safeProviderEndpoint("https://nominatim.openstreetmap.org/search"));
  assert.equal(isPublicHostname("[::ffff:127.0.0.1]"), false);
});
test("financial schemas reject missing costs, unknown keys and prototype keys", () => {
  assert.equal(settingsSchema.safeParse(DEFAULT_SETTINGS).success, true);
  assert.equal(
    settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      credit_costs: { search: 1 },
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      unit_costs: { ...DEFAULT_SETTINGS.unit_costs, unknown: 1 },
    }).success,
    false,
  );
  const costs = JSON.parse('{"__proto__":0}');
  assert.equal(
    settingsSchema.safeParse({ ...DEFAULT_SETTINGS, credit_costs: costs })
      .success,
    false,
  );
});
test("search rejects ambiguous state, oversized radius and inverted map bounds", () => {
  assert.equal(
    searchSchema.safeParse({ ...DEFAULT_FILTERS, state: "XX" }).success,
    false,
  );
  assert.equal(
    searchSchema.safeParse({ ...DEFAULT_FILTERS, radius: 100000 }).success,
    false,
  );
  assert.equal(
    searchSchema.safeParse({ ...DEFAULT_FILTERS, bounds: [2, 1, -2, 4] })
      .success,
    false,
  );
  assert.equal(
    searchSchema.parse({
      ...DEFAULT_FILTERS,
      state: " ce ",
      city: " Fortaleza ",
    }).city,
    "Fortaleza",
  );
});
test("normalization uses stable SHA-256 IDs and does not invent city for moved map areas", () => {
  const raw = {
    external_id: "node/123",
    name: "Fixture",
    latitude: -3.7,
    longitude: -38.5,
  };
  const first = normalizeBusiness(raw, DEFAULT_FILTERS, center, "osm");
  assert.match(first.id, /^osm_[a-f0-9]{64}$/);
  assert.equal(
    first.id,
    normalizeBusiness(raw, DEFAULT_FILTERS, center, "osm").id,
  );
  const moved = normalizeBusiness(
    raw,
    { ...DEFAULT_FILTERS, bounds: [-24, -47, -23, -46] },
    center,
    "osm",
  );
  assert.equal(moved.city, "Área pesquisada");
  assert.equal(moved.state, "");
  assert.equal(moved.rating, null);
  assert.equal(moved.public_whatsapp, null);
});
test("scoring stays finite for invalid weights and missing reputation", () => {
  const result = scoreBusiness(
    { ...business, rating: NaN, reviews_count: NaN },
    { gap: NaN, rating: Infinity, reviews: -1 },
  );
  assert.ok(Number.isFinite(result.score));
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(
    !result.reasons.some((reason) => /NaN|Infinity/.test(reason.label)),
  );
});
test("eight requested niches adapt copy without inventing services or professional credentials", () => {
  const drafts = [];
  for (const category of [
    "Restaurantes",
    "Academias",
    "Clínicas",
    "Clínicas odontológicas",
    "Barbearias",
    "Estéticas",
    "Advogados",
    "Imobiliárias",
  ]) {
    const lead = {
      ...business,
      category,
      services: [],
      opening_hours: null,
      rating: null,
      reviews_count: null,
    };
    const draft = websiteDraft(lead);
    drafts.push(draft);
    assert.deepEqual(draft.services, []);
    assert.equal(draft.hours, "");
    assert.ok(!JSON.stringify(draft).includes("convênio"));
    const script = generateScript(
      lead,
      "WhatsApp",
      DEFAULT_SETTINGS,
      undefined,
    );
    assert.ok(script.includes(lead.business_name));
  }
  assert.ok(new Set(drafts.map((d) => d.style)).size >= 4);
  assert.ok(new Set(drafts.map((d) => d.headline)).size >= 4);
});
test("client coalesces double submit and sends an idempotency key", async (t) => {
  let calls = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      calls++;
      assert.match(
        String((init.headers as Record<string, string>)["Idempotency-Key"]),
        /^[a-z0-9-]{36}$/,
      );
      await gate;
      return Response.json({ data: { id: "fixture" } });
    },
  );
  const first = api("websites", { business_id: "client-test" });
  const second = api("websites", { business_id: "client-test" });
  release();
  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
});
test("client handles a non-JSON response without exposing parser errors", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>sign-in</html>", { status: 503 }),
  );
  await assert.rejects(
    api("bootstrap"),
    (e) =>
      e instanceof ApiError &&
      e.code === "INVALID_RESPONSE" &&
      !e.message.includes("Unexpected"),
  );
});

test("client also submits on a non-secure local preview without randomUUID", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", {
    value: undefined,
    configurable: true,
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(crypto, "randomUUID", descriptor);
    else Reflect.deleteProperty(crypto, "randomUUID");
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      assert.match(
        String((init.headers as Record<string, string>)["Idempotency-Key"]),
        /^op_[a-f0-9]{32}$/,
      );
      return Response.json({ data: { saved: true } });
    },
  );
  assert.deepEqual(
    await api("leads/save", { business_id: "insecure-preview" }),
    { saved: true },
  );
});

test("embedded demos navigate within srcdoc while published documents use their own URL", () => {
  const content = websiteDraft(business);
  assert.ok(
    buildSiteHtml(content, { embedded: true }).includes(
      '<base href="about:srcdoc">',
    ),
  );
  assert.ok(!buildSiteHtml(content).includes('<base href="about:srcdoc">'));
});
