import { test } from "node:test";
import { isPublicHostname } from "../lib/domain/url-policy";
import assert from "node:assert/strict";
import {
  buildPresence,
  classifyUrl,
  safeExternalUrl,
  domainMatchesBusiness,
} from "../lib/domain/presence";
import { distanceKm, inBounds } from "../lib/domain/geo";
import { scoreBusiness } from "../lib/domain/scoring";
import {
  areDuplicates,
  dedupeBusinesses,
  mergeBusinesses,
} from "../lib/domain/dedupe";
import { filterBusinesses, parseNaturalSearch } from "../lib/domain/filters";
import { generateScript, websiteDraft } from "../lib/domain/generation";
import { buildSiteHtml } from "../lib/domain/site-html";
import { sanitizeCell, csvExport, xlsxExport } from "../lib/domain/export";
import { DEFAULT_FILTERS, DEFAULT_SETTINGS } from "../lib/domain/constants";
import { fixtureBusinesses, MockProvider } from "../lib/providers/mock";
import {
  searchSchema,
  settingsSchema,
  contentSchema,
} from "../lib/server/validation";
import { unzipSync, strFromU8 } from "fflate";
const center = {
  latitude: -3.735,
  longitude: -38.507,
  label: "Fortaleza",
  source: "fictício",
};
const fixtures = fixtureBusinesses(DEFAULT_FILTERS, center);
test("redes sociais, agregadores e diretórios nunca são domínio próprio", () => {
  for (const url of [
    "https://instagram.com/negocio",
    "https://www.facebook.com/negocio",
    "https://m.facebook.com/negocio",
  ])
    assert.equal(classifyUrl(url), "social_only");
  assert.equal(classifyUrl("https://linktr.ee/negocio"), "aggregator");
  assert.equal(
    classifyUrl("https://www.doctoralia.com.br/clinica"),
    "directory",
  );
  assert.equal(classifyUrl("https://wa.me/5585000000000"), "directory");
  assert.equal(classifyUrl("https://clinica.example"), "own_website");
});
test("campo website ausente mantém baixa confiança e incerteza explícita", () => {
  const p = buildPresence({
    website: null,
    instagram: null,
    facebook: null,
    whatsapp: null,
    source: "Uma fonte",
    checked_at: "2026-10-06",
  });
  assert.equal(p.website.value, null);
  assert.ok(p.website.confidence < 0.75);
  assert.match(p.explanation, /não confirma/i);
  assert.ok(!p.explanation.includes("não possui site"));
  assert.equal(p.ownership, "unverified");
});
test("URLs inválidas e protocolos executáveis não são sites próprios", () => {
  assert.equal(classifyUrl("http://["), "inconclusive");
  assert.equal(safeExternalUrl("javascript:alert(1)"), undefined);
  assert.equal(safeExternalUrl("https://user:password@example.org"), undefined);
});
test("geodistância e limites geográficos corretos", () => {
  assert.equal(distanceKm(center, center), 0);
  assert.ok(
    Math.abs(
      distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }) -
        111.195,
    ) < 0.01,
  );
  assert.equal(inBounds(-3.7, -38.5, [-4, -39, -3, -38]), true);
  assert.equal(inBounds(-5, -38.5, [-4, -39, -3, -38]), false);
  assert.equal(inBounds(0, 179, [-1, 170, 1, -170]), true);
});
test("deduplicação consolida mesmo negócio sem confundir vizinhos e filiais", () => {
  const a = fixtures[0];
  const copy = {
    ...a,
    id: "outro",
    business_name: a.business_name.toUpperCase(),
    source: "osm" as const,
  };
  assert.equal(areDuplicates(a, copy), true);
  assert.equal(dedupeBusinesses([a, copy]).length, 1);
  assert.equal(
    areDuplicates(a, {
      ...copy,
      business_name: "Outro negócio completamente diferente",
      phone: a.phone,
    }),
    false,
  );
  assert.equal(
    areDuplicates(a, { ...copy, latitude: a.latitude + 0.1 }),
    false,
  );
  assert.equal(areDuplicates(a, { ...copy, is_demo: false }), false);
});
test("score é limitado a 100, configurável e explicável", () => {
  const b = fixtures[0];
  const r = scoreBusiness(b);
  assert.equal(
    r.score,
    r.reasons.reduce((s, x) => s + x.points, 0),
  );
  assert.ok(r.score >= 0 && r.score <= 100);
  const all = scoreBusiness(
    { ...b, recent_activity: true },
    {
      gap: 50,
      reviews: 50,
      rating: 50,
      whatsapp: 50,
      social: 50,
      complete: 50,
      segment: 50,
      activity: 50,
    },
  );
  assert.equal(all.score, 100);
  assert.equal(scoreBusiness(b, {}).score, 0);
});
test("dados desconhecidos não geram pontos de reputação ou atividade", () => {
  const b = {
    ...fixtures[0],
    rating: null,
    reviews_count: null,
    recent_activity: null,
  };
  const r = scoreBusiness(b);
  assert.ok(!r.reasons.some((x) => /avalia|nota|atividade/i.test(x.label)));
});
test("maior confiança gera prioridade maior sem afirmar ausência absoluta", () => {
  const b = fixtures[0];
  const low = {
    ...b,
    digital_presence: {
      ...b.digital_presence,
      website: { ...b.digital_presence.website, confidence: 0.3 },
    },
  };
  assert.ok(scoreBusiness(b).score > scoreBusiness(low).score);
});
test("filtros combinam score, contato, avaliações, raio e website", () => {
  const f = {
    ...DEFAULT_FILTERS,
    website_filter: "no_own",
    min_score: 80,
    min_reviews: 100,
    has_whatsapp: true,
  };
  const r = filterBusinesses(fixtures, f);
  assert.ok(r.length > 0);
  for (const b of r) {
    assert.ok(
      b.lead_score >= 80 &&
        b.reviews_count! >= 100 &&
        b.public_whatsapp &&
        b.distance_km <= 10,
    );
    assert.notEqual(b.website_status, "own_website");
  }
  const sorted = filterBusinesses(fixtures, {
    ...DEFAULT_FILTERS,
    prioritize_no_site: false,
    sort: "distance",
  });
  assert.ok(
    sorted.every((x, i) => !i || sorted[i - 1].distance_km <= x.distance_km),
  );
});
test("pesquisa natural expõe os filtros interpretados antes da execução", () => {
  const r = parseNaturalSearch(
    "Encontre academias em um raio de 8 km do centro de Fortaleza com mais de 50 avaliações e sem site próprio",
    DEFAULT_FILTERS,
  );
  assert.equal(r.filters.category, "Academias");
  assert.equal(r.filters.radius, 8);
  assert.equal(r.filters.city, "Fortaleza");
  assert.equal(r.filters.neighborhood, "Centro");
  assert.equal(r.filters.min_reviews, 50);
  assert.equal(r.filters.website_filter, "no_own");
  assert.ok(r.interpreted.length >= 5);
});
test("localização de demonstração não inventa coordenadas para cidade desconhecida", async () => {
  await assert.rejects(
    () =>
      new MockProvider().getCoordinates({
        ...DEFAULT_FILTERS,
        city: "Cidade inexistente",
      }),
    /demonstração cobre/,
  );
});
test("validação server-side rejeita raio inválido, CEP e campos inesperados", () => {
  assert.equal(
    searchSchema.safeParse({ ...DEFAULT_FILTERS, radius: 200 }).success,
    false,
  );
  assert.equal(
    searchSchema.safeParse({ ...DEFAULT_FILTERS, postal_code: "abc" }).success,
    false,
  );
  assert.equal(
    searchSchema.safeParse({ ...DEFAULT_FILTERS, organization_id: "outro" })
      .success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      score_weights: { gap: 100 },
    }).success,
    false,
  );
});
test("sites variam conforme o nicho e nunca inventam equipe/convênio/reputação", () => {
  const clinic = websiteDraft(fixtures[0]);
  const food = websiteDraft({ ...fixtures[0], category: "Restaurantes" });
  const gym = websiteDraft({ ...fixtures[0], category: "Academias" });
  const lawyer = websiteDraft({ ...fixtures[0], category: "Advogados" });
  assert.deepEqual(
    [clinic.style, food.style, gym.style, lawyer.style],
    ["clinic", "editorial", "bold", "elegant"],
  );
  const blank = websiteDraft({ ...fixtures[0], services: [] });
  assert.equal(blank.services.length, 0);
  assert.ok(!blank.sections.includes("services"));
  assert.ok(!blank.about.includes("convênios"));
});
test("HTML de demonstração escapa dados externos e identifica o caráter comercial", () => {
  const content = {
    ...websiteDraft(fixtures[0]),
    name: "<script>alert(1)</script>",
    headline: "<img src=x onerror=alert(1)>",
  };
  const html = buildSiteHtml(content, { isFictional: true });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(!html.includes("<img src=x onerror"));
  assert.match(html, /Demonstração comercial — não é o site oficial/);
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /width=device-width/);
  assert.ok(!html.includes("https://wa.me/"));
  assert.ok(!html.includes("LocalBusiness"));
});
test("conteúdo estruturado rejeita cores/injeção, imagens sem HTTPS e estilos inválidos", () => {
  const c = websiteDraft(fixtures[0]);
  assert.equal(contentSchema.safeParse(c).success, true);
  assert.equal(
    contentSchema.safeParse({ ...c, color: "red;}</style>" }).success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({ ...c, image_url: "javascript:alert(1)" }).success,
    false,
  );
});
test("scripts por nicho diferem e preservam incerteza, consentimento e recusas", () => {
  const b = fixtures[0];
  const restaurant = generateScript(
    { ...b, category: "Restaurantes" },
    "WhatsApp",
    DEFAULT_SETTINGS,
    undefined,
  );
  const clinic = generateScript(b, "WhatsApp", DEFAULT_SETTINGS, undefined);
  assert.notEqual(restaurant, clinic);
  assert.match(restaurant, /cardápio/);
  assert.match(clinic, /pode ser que ele exista/);
  const lawyer = generateScript(
    { ...b, category: "Advogados" },
    "WhatsApp",
    DEFAULT_SETTINGS,
    undefined,
  );
  assert.match(lawyer, /institucional/);
  assert.ok(!lawyer.includes("resultado garantido"));
  assert.match(
    generateScript(
      b,
      "WhatsApp",
      DEFAULT_SETTINGS,
      undefined,
      "objection",
      "Não tenho interesse agora.",
    ),
    /Não vou continuar enviando mensagens/,
  );
});
test("CSV e XLSX neutralizam fórmulas e preservam Unicode", () => {
  for (const s of ['=HYPERLINK("x")', "+SUM(1)", "@cmd", "-2", " \t=cmd"])
    assert.ok(sanitizeCell(s).startsWith("'"));
  assert.equal(sanitizeCell("Clínica Aurora"), "Clínica Aurora");
  const b = { ...fixtures[0], business_name: "=SUM(1,2)" };
  assert.match(csvExport([b], ["business_name", "is_demo"]), /'=SUM/);
  const zip = unzipSync(xlsxExport([b], ["business_name", "is_demo"]));
  assert.ok(zip["xl/workbook.xml"]);
  const xml = strFromU8(zip["xl/worksheets/sheet1.xml"]);
  assert.ok(!xml.includes("<f>"));
  assert.match(xml, /'=SUM/);
});

test("domínio candidato sem associação lexical é inconclusivo, nunca ausência de site", () => {
  const data = {
    website: "https://dominio-diferente.com.br",
    business_name: "Clínica Aurora",
    instagram: null,
    facebook: null,
    whatsapp: null,
    source: "Provedor",
    checked_at: "2026-10-06",
  };
  assert.equal(buildPresence(data).status, "inconclusive");
  assert.equal(
    domainMatchesBusiness("Clínica Aurora", "https://aurora.com.br"),
    true,
  );
  const probable = buildPresence({ ...data, website: "https://aurora.com.br" });
  assert.equal(probable.ownership, "probable");
  assert.match(probable.explanation, /confirmação independente/);
  const f = fixtures[0];
  assert.equal(
    filterBusinesses([{ ...f, website_status: "inconclusive" }], {
      ...DEFAULT_FILTERS,
      website_filter: "no_own",
    }).length,
    0,
  );
});
test("política preliminar de auditoria bloqueia redes privadas, reservadas e hosts locais", () => {
  for (const h of [
    "localhost",
    "127.0.0.1",
    "10.0.0.4",
    "172.16.0.1",
    "192.168.4.2",
    "169.254.169.254",
    "100.64.0.1",
    "198.18.1.1",
    "203.0.113.5",
    "2130706433",
    "[::1]",
    "clinica.example",
    "service.internal",
    "app.local",
  ])
    assert.equal(isPublicHostname(h), false, h);
  assert.equal(isPublicHostname("example.org"), true);
});
test("consolidação preserva dados e fontes, e não relaxa direitos de exportação", () => {
  const old = fixtures[0];
  const next = {
    ...old,
    id: "outra-fonte",
    source: "osm" as const,
    website: null,
    rating: null,
    reviews_count: null,
    public_whatsapp: null,
    instagram: null,
    services: [],
    fields: {
      website: {
        value: null,
        source: "OSM",
        confidence: 0.25,
        last_checked_at: "2026-10-06",
      },
    },
    can_export: false,
  };
  const merged = mergeBusinesses(old, next);
  assert.equal(merged.rating, old.rating);
  assert.equal(merged.reviews_count, old.reviews_count);
  assert.equal(merged.instagram, old.instagram);
  assert.equal(merged.can_export, false);
  assert.equal(merged.id, old.id);
});
test("pontuação explicada continua somando exatamente 100 sob pesos altos", () => {
  const scored = scoreBusiness(
    { ...fixtures[0], recent_activity: true },
    {
      gap: 50,
      reviews: 50,
      rating: 50,
      whatsapp: 50,
      social: 50,
      complete: 50,
      segment: 50,
      activity: 50,
    },
  );
  assert.equal(
    scored.reasons.reduce((s, r) => s + r.points, 0),
    scored.score,
  );
});
test("remoção de seções também remove links de navegação relacionados", () => {
  const c = { ...websiteDraft(fixtures[0]), sections: ["contact"] };
  const html = buildSiteHtml(c, { isFictional: true });
  assert.ok(!html.includes('href="#services"'));
  assert.ok(!html.includes('href="#about"'));
  assert.ok(!html.includes('href="#location"'));
});
