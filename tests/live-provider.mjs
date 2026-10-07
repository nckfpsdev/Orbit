// Optional real OSM smoke test. Not part of deterministic CI, not a production deploy.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve("wrangler/package.json"))(
  "miniflare",
);
async function modulesIn(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await modulesIn(path)));
    else if (/\.m?js$/.test(entry.name))
      result.push({
        type: "ESModule",
        path,
        contents: await readFile(path, "utf8"),
      });
  }
  return result;
}
const modules = await modulesIn(resolve("dist/server"));
modules.sort((a, b) =>
  a.path === resolve("dist/server/index.js")
    ? -1
    : b.path === resolve("dist/server/index.js")
      ? 1
      : a.path.localeCompare(b.path),
);
const permitted = new Set([
  "viacep.com.br",
  "nominatim.openstreetmap.org",
  "maps.mail.ru",
]);
const requests = [];
const appOrigin = process.env.ORBIT_SMOKE_APP_ORIGIN;
assert.ok(
  appOrigin,
  "Set ORBIT_SMOKE_APP_ORIGIN to the actual configured HTTPS Site origin; no invented contact is sent to providers",
);
const origin = new URL(appOrigin);
assert.ok(
  origin.protocol === "https:" &&
    origin.origin === appOrigin &&
    !origin.username &&
    !origin.password,
);
const nodeTransport = process.env.ORBIT_SMOKE_NODE_TRANSPORT === "1";
const searches = [];
async function recordEvidence(status) {
  const report = {
    status,
    source: "real OpenStreetMap / ViaCEP / Nominatim",
    timestamp: new Date().toISOString(),
    searches,
    siwc_validated: false,
    deployed_worker_egress_validated: false,
    transport: nodeTransport
      ? "Node outbound bridge for isolated local Worker; NOT destination Worker DNS or SIWC proof"
      : "Isolated local workerd; NOT deployed destination Worker proof",
    requests,
  };
  console.log(JSON.stringify(report));
  if (process.env.ORBIT_SMOKE_REPORT)
    await writeFile(
      process.env.ORBIT_SMOKE_REPORT,
      JSON.stringify(report, null, 2) + "\n",
      { mode: 0o600 },
    );
}
const mf = new Miniflare({
  name: "orbit-live-provider-audit",
  modules,
  modulesRoot: resolve("dist/server"),
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "orbit-live-provider-audit" },
  bindings: { APP_ENV: "production", APP_ORIGIN: appOrigin },
  // Local workerd has no DNS access in this execution environment. Node transports
  // the identical real requests; payloads are neither intercepted nor fabricated.
  ...(nodeTransport
    ? {
        outboundService: async (request) => {
          const url = new URL(request.url);
          if (url.protocol !== "https:" || !permitted.has(url.hostname))
            throw new Error("Unapproved provider destination");
          const start = Date.now();
          const response = await fetch(url, {
            method: request.method,
            headers: request.headers,
            redirect: "manual",
            signal: AbortSignal.timeout(30000),
            ...(request.method === "POST"
              ? { body: await request.text() }
              : {}),
          });
          requests.push({
            provider: url.hostname,
            status: response.status,
            duration_ms: Date.now() - start,
            method: request.method,
            app_identified:
              request.headers.get("user-agent")?.includes(appOrigin) ?? false,
          });
          return response;
        },
      }
    : {}),
});
const db = await mf.getD1Database("DB");
const headers = {
  // In-memory integration harness only, NOT evidence of SIWC authentication.
  "oai-authenticated-user-id": `provider-diagnostic-${crypto.randomUUID()}`,
  "oai-authenticated-user-email": "provider-smoke@orbit.test",
  "content-type": "application/json",
  origin: appOrigin,
};
async function api(path, body) {
  const r = await mf.dispatchFetch(`${appOrigin}/api/v1/${path}`, {
    headers,
    method: body ? "POST" : "GET",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j = await r.json();
  if (![200, 201].includes(r.status))
    console.error(
      JSON.stringify({
        action: path,
        status: r.status,
        code: j.error?.code,
        requests,
      }),
    );
  assert.ok(
    [200, 201].includes(r.status),
    `${path}: ${j.error?.code || r.status}`,
  );
  return j.data;
}
try {
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of (await readFile(`drizzle/${file}`, "utf8"))
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  const boot = await api("bootstrap");
  assert.equal(boot.stats.found, 0);
  assert.equal(boot.provider_status.mock, false);
  const filters = {
    country: "Brasil",
    state: "CE",
    city: "Fortaleza",
    neighborhood: "",
    postal_code: "60160-230",
    radius: 2,
    category: "Restaurantes",
    sub_category: "",
    query: "",
    provider: "osm",
    prioritize_no_site: true,
    website_filter: "all",
    min_rating: 0,
    min_reviews: 0,
    min_score: 0,
    has_phone: false,
    has_whatsapp: false,
    crm_status: "all",
    sort: "score",
  };
  for (const category of ["Restaurantes", "Farmácias"]) {
    if (searches.length)
      await new Promise((resolve) => setTimeout(resolve, 10500));
    const radius = category === "Restaurantes" ? 2 : 1;
    const result = await api("search", { ...filters, category, radius });
    assert.ok(
      result.businesses.length > 0,
      "Source returned no businesses; diagnostic cannot approve discovery",
    );
    assert.ok(
      result.businesses.every(
        (b) =>
          !b.is_demo &&
          b.source === "osm" &&
          b.business_name &&
          b.category === category &&
          Number.isFinite(b.latitude) &&
          Number.isFinite(b.longitude) &&
          b.rating === null &&
          b.reviews_count === null &&
          b.lead_score >= 0 &&
          b.lead_score <= 100,
      ),
    );
    const retained = await api(`leads/${result.businesses[0].id}`);
    assert.equal(
      retained.business.business_name,
      result.businesses[0].business_name,
    );
    const requestsBefore = requests.length;
    const cached = await api("search", { ...filters, category, radius });
    assert.ok(cached.cached && cached.credits_used === 0);
    assert.equal(requests.length, requestsBefore);
    searches.push({
      category,
      country: filters.country,
      state: filters.state,
      city: filters.city,
      postal_code: filters.postal_code,
      radius_km: radius,
      businesses: result.businesses.length,
      partial: result.partial,
      cache_verified: true,
      sample: result.businesses.slice(0, 3).map((b) => ({
        name: b.business_name,
        category: b.category,
        city: b.city,
        latitude: b.latitude,
        longitude: b.longitude,
        source: b.source,
        source_url: b.source_url,
      })),
    });
    await recordEvidence(searches.length === 2 ? "PASS" : "PARTIAL");
  }
} catch (error) {
  await recordEvidence("FAIL");
  throw error;
} finally {
  await mf.dispose();
}
