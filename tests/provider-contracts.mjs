import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createFetchMock } = createRequire(
  require.resolve("wrangler/package.json"),
)("miniflare");

// Controlled upstream failure injection, not evidence of a live vendor connection.
export async function auditProviders({
  mf,
  db,
  options,
  request,
  check,
  settings,
}) {
  const upstream = createFetchMock();
  const osmRequests = [];
  upstream.disableNetConnect();
  await mf.setOptions({
    ...options,
    outboundService: async (request) => {
      const body = request.method === "POST" ? await request.text() : undefined;
      if (new URL(request.url).hostname === "maps.mail.ru")
        osmRequests.push({
          method: request.method,
          identity: request.headers.get("user-agent"),
          accept: request.headers.get("accept"),
          contentType: request.headers.get("content-type"),
        });
      return fetch(request.url, {
        method: request.method,
        headers: request.headers,
        redirect: "manual",
        dispatcher: upstream,
        ...(body === undefined ? {} : { body }),
      });
    },
    bindings: {
      ...options.bindings,
      LEAD_PROVIDER_URL: "https://licensed.orbit.test",
      LEAD_PROVIDER_KEY: "contract-test-key",
      WEBSITE_AUDIT_URL: "https://audit.orbit.test",
      WEBSITE_AUDIT_KEY: "contract-test-key",
      GEMINI_API_KEY: "contract-test-key",
      GEMINI_MODEL: "contract-test-model",
    },
  });
  db = await mf.getD1Database("DB");
  const licensed = upstream.get("https://licensed.orbit.test");
  const audit = upstream.get("https://audit.orbit.test");
  const gemini = upstream.get("https://generativelanguage.googleapis.com");
  const boot = await request("/api/v1/bootstrap", undefined, "contracts");
  const org = boot.data.organization.id;
  const filters = {
    ...settings,
    provider: "licensed",
    radius: 1,
    bounds: [-3.74, -38.51, -3.72, -38.49],
    min_reviews: 0,
    min_rating: 0,
    min_score: 0,
    has_phone: false,
    has_whatsapp: false,
    website_filter: "all",
  };
  const raw = {
    external_id: "authorized-contract-1",
    name: "Negócio do contrato isolado",
    latitude: -3.73,
    longitude: -38.5,
    website: "https://business.orbit.test",
    can_persist: true,
    can_export: false,
  };
  const cost = async () =>
    (
      await db
        .prepare("SELECT credits FROM organizations WHERE id=?")
        .bind(org)
        .first()
    ).credits;
  const response = (pool, path, status, payload, headers = {}) =>
    pool
      .intercept({ path, method: "POST" })
      .reply(
        status,
        typeof payload === "string" ? payload : JSON.stringify(payload),
        { headers: { "content-type": "application/json", ...headers } },
      );
  let before = await cost();
  response(licensed, "/businesses/search", 302, "", {
    location: "https://untrusted.orbit.test/steal",
  });
  let result = await request("/api/v1/search", filters, "contracts");
  check(
    result.status === 502 && result.error.code === "PROVIDER_REDIRECT",
    `Worker rejects upstream redirects without forwarding bearer credentials: ${result.status} ${result.error?.code}`,
  );
  check(
    (await cost()) === before,
    "Redirect failure refunds credit reservation",
  );
  response(licensed, "/businesses/search", 429, {});
  result = await request(
    "/api/v1/search",
    { ...filters, radius: 2 },
    "contracts",
  );
  check(
    result.status === 429 && result.error.code === "PROVIDER_RATE_LIMIT",
    "Upstream rate limit is typed and does not become an empty result",
  );
  check((await cost()) === before, "Upstream rate limit refunds credits");
  response(licensed, "/businesses/search", 200, {});
  result = await request(
    "/api/v1/search",
    { ...filters, radius: 3 },
    "contracts",
  );
  check(
    result.status === 502 && result.error.code === "PROVIDER_INVALID_DATA",
    "Invalid licensed contract is a 502, not a form error or fabricated result",
  );
  response(licensed, "/businesses/search", 200, {
    businesses: [{ ...raw, can_persist: false }],
    license: "isolated-test-license",
  });
  result = await request(
    "/api/v1/search",
    { ...filters, radius: 4 },
    "contracts",
  );
  check(
    result.status === 502,
    "Records without retention permission are rejected",
  );
  response(licensed, "/businesses/search", 200, {
    businesses: [raw, raw],
    license: "isolated-test-license",
    partial: true,
    warnings: ["Resultado parcial do contrato de teste."],
  });
  result = await request(
    "/api/v1/search",
    { ...filters, radius: 5 },
    "contracts",
  );
  check(
    result.status === 200 && result.data.businesses.length === 1,
    "Authorized provider records are normalized and deduplicated",
  );
  check(
    result.data.partial &&
      !result.data.is_demo &&
      result.data.warnings.length > 0,
    "Partial upstream result preserves its warning and source provenance",
  );
  const business = result.data.businesses[0];
  check(
    business.source === "licensed" && !business.can_export,
    "Per-record export rights are retained",
  );
  const exported = await request(
    "/api/v1/export",
    { ids: [business.id], fields: ["business_name"], format: "csv" },
    "contracts",
    true,
  );
  check(
    exported.status === 403,
    "Export rejects records without source permission",
  );
  response(licensed, "/businesses/search", 200, {
    businesses: [raw],
    license: "isolated-test-license",
  });
  result = await request(
    "/api/v1/search",
    { ...filters, radius: 6 },
    "contracts",
  );
  check(
    result.status === 200 && result.data.businesses[0].id === business.id,
    "Repeated external ID preserves business identity across searches",
  );
  before = await cost();
  response(audit, "/", 200, { http_status: 200, response_ms: 100, checks: [] });
  result = await request(`/api/v1/leads/${business.id}/audit`, {}, "contracts");
  check(
    result.status === 502 && result.error.code === "PROVIDER_INVALID_DATA",
    "Audit requires explicit DNS, redirect and robots attestations",
  );
  check((await cost()) === before, "Unsafe audit contract refunds credits");
  response(audit, "/", 200, {
    safety: {
      public_dns_validated: true,
      redirects_validated: true,
      robots_checked: true,
      final_url: "http://127.0.0.1/admin",
    },
    http_status: 200,
    response_ms: 100,
    checks: [],
  });
  result = await request(`/api/v1/leads/${business.id}/audit`, {}, "contracts");
  check(
    result.status === 422 && result.error.code === "UNSAFE_REDIRECT",
    "Audit rejects final private address even when the upstream claims validation",
  );
  response(audit, "/", 200, {
    safety: {
      public_dns_validated: true,
      redirects_validated: true,
      robots_checked: true,
      final_url: raw.website,
    },
    http_status: 503,
    response_ms: 100,
    checks: [],
  });
  result = await request(`/api/v1/leads/${business.id}/audit`, {}, "contracts");
  check(
    result.status === 200 &&
      result.data.mode === "measured" &&
      result.data.http_status === 503,
    "Measured audit stores actual status without inventing performance metrics",
  );
  response(
    gemini,
    /\/v1beta\/models\/contract-test-model:generateContent/,
    503,
    {},
  );
  const site = await request(
    "/api/v1/websites",
    { business_id: business.id },
    "contracts",
  );
  check(
    site.status === 201 && site.data.engine === "local",
    "AI outage falls back to the explicitly identified local site engine",
  );
  check(
    site.data.content.services.length === 0 && !site.data.content.hours,
    "Fallback does not invent services or opening hours",
  );
  response(
    gemini,
    /\/v1beta\/models\/contract-test-model:generateContent/,
    200,
    { candidates: [{ content: { parts: [{ text: "invalid JSON" }] } }] },
  );
  const script = await request(
    "/api/v1/scripts",
    { business_id: business.id, channel: "WhatsApp", kind: "first" },
    "contracts",
  );
  check(
    script.status === 201 && script.data.engine === "local",
    "Invalid AI output falls back to a contextual script for human review",
  );
  const timeout = licensed
    .intercept({ path: "/businesses/details", method: "POST" })
    .replyWithError(new Error("Simulated provider timeout"));
  void timeout;
  await db
    .prepare(
      "UPDATE businesses SET data_json=json_set(data_json,'$.last_checked_at',NULL) WHERE id=? AND organization_id=?",
    )
    .bind(business.id, org)
    .run();
  before = await cost();
  result = await request(
    `/api/v1/leads/${business.id}/enrich`,
    {},
    "contracts",
  );
  check(
    [502, 503].includes(result.status) &&
      ["PROVIDER_UNAVAILABLE", "PROVIDER_ERROR"].includes(result.error.code),
    "Transport failure returns a safe retryable provider error",
  );
  check(
    (await cost()) === before,
    "Failed enrichment preserves credits and the existing basic lead",
  );
  const retained = await request(
    `/api/v1/leads/${business.id}`,
    undefined,
    "contracts",
  );
  check(
    retained.status === 200 &&
      retained.data.business.business_name === raw.name,
    "Basic lead remains readable after enrichment failure",
  );
  const overpass = upstream.get("https://maps.mail.ru");
  const overpassPath = "/osm/tools/overpass/api/interpreter";
  let geometryRequested = false;
  overpass
    .intercept({ path: overpassPath, method: "POST" })
    .reply((request) => {
      const query = new URLSearchParams(String(request.body)).get("data") || "";
      geometryRequested =
        /out center 250;/.test(query) &&
        /\[maxsize:33554432\]/.test(query) &&
        !/out center tags/.test(query);
      return {
        statusCode: 200,
        data: JSON.stringify({
          elements: [
            {
              type: "node",
              id: 1001,
              lat: -3.73,
              lon: -38.5,
              tags: {
                name: "Clínica do contrato geográfico",
                amenity: "dentist",
              },
            },
          ],
        }),
        responseOptions: { headers: { "content-type": "application/json" } },
      };
    });
  const geographic = await request(
    "/api/v1/search",
    { ...filters, provider: "osm", radius: 7 },
    "geocontracts",
  );
  check(
    geographic.status === 200 &&
      geographic.data.businesses.length === 1 &&
      geometryRequested,
    "Overpass query retains node coordinates and creates a real-provider record under the simulated contract",
  );
  check(
    osmRequests[0].identity === "OrbitLocal/0.1.0 (+https://orbit.test)" &&
      osmRequests[0].accept === "application/json" &&
      osmRequests[0].contentType ===
        "application/x-www-form-urlencoded; charset=UTF-8",
    "Compiled Worker sends the configured application identity and encoded POST headers",
  );
  const cached = await request(
    "/api/v1/search",
    { ...filters, provider: "osm", radius: 7 },
    "geocontracts",
  );
  check(
    cached.status === 200 &&
      cached.data.cached &&
      cached.data.credits_used === 0 &&
      osmRequests.length === 1,
    "Repeated OSM search uses cache without another upstream request or credit charge",
  );
  const throttled = await request(
    "/api/v1/search",
    { ...filters, provider: "osm", radius: 8 },
    "geocontracts",
  );
  check(
    throttled.status === 429 &&
      throttled.error.code === "RATE_LIMIT" &&
      throttled.error.retry_after > 0 &&
      osmRequests.length === 1,
    "Global endpoint rate limit blocks rapid distinct queries before contacting the source",
  );

  // Reset only the isolated contract database's fair-use window between cases.
  const resetWindow = () =>
    db
      .prepare("DELETE FROM rate_limits WHERE key LIKE 'overpass_global_%'")
      .run();
  const osmSearch = (radius) =>
    request(
      "/api/v1/search",
      { ...filters, provider: "osm", radius },
      "geocontracts",
    );
  await resetWindow();
  response(overpass, overpassPath, 503, {});
  response(overpass, overpassPath, 200, { elements: [] });
  let requestsBefore = osmRequests.length;
  result = await osmSearch(8);
  check(
    result.status === 200 && osmRequests.length === requestsBefore + 2,
    "Transient Overpass 503 receives one sequential bounded retry",
  );
  await resetWindow();
  response(overpass, overpassPath, 406, {});
  requestsBefore = osmRequests.length;
  result = await osmSearch(9);
  check(
    result.status === 502 &&
      result.error.code === "PROVIDER_ERROR" &&
      osmRequests.length === requestsBefore + 1,
    "Overpass 406 is reported without retries, browser impersonation or endpoint rotation",
  );
  await resetWindow();
  response(overpass, overpassPath, 429, {});
  requestsBefore = osmRequests.length;
  result = await osmSearch(10);
  check(
    result.status === 429 &&
      result.error.code === "PROVIDER_RATE_LIMIT" &&
      osmRequests.length === requestsBefore + 1,
    "Overpass 429 preserves the rate-limit response and makes no retry",
  );
  await resetWindow();
  response(overpass, overpassPath, 503, {});
  response(overpass, overpassPath, 503, {});
  requestsBefore = osmRequests.length;
  result = await osmSearch(11);
  check(
    result.status === 502 && osmRequests.length === requestsBefore + 2,
    "Repeated transient failure stops after two attempts",
  );
  check(
    (
      await db
        .prepare(
          "SELECT count(*) AS n FROM caches WHERE key LIKE 'overpass_lease_%'",
        )
        .first()
    ).n === 0,
    "Failed Overpass query releases the shared concurrency lease",
  );
  const limiter = await db
    .prepare("SELECT key FROM rate_limits WHERE key LIKE 'overpass_global_%'")
    .first();
  const leaseKey = limiter.key.replace("overpass_global_", "overpass_lease_");
  await db
    .prepare(
      "INSERT INTO caches (key,organization_id,value_json,expires_at) VALUES (?,NULL,?,?)",
    )
    .bind(
      leaseKey,
      JSON.stringify("other-in-flight-request"),
      Date.now() + 45000,
    )
    .run();
  requestsBefore = osmRequests.length;
  result = await osmSearch(12);
  check(
    result.status === 429 &&
      result.error.code === "PROVIDER_BUSY" &&
      osmRequests.length === requestsBefore,
    "Shared D1 lease rejects concurrent endpoint use before issuing an upstream query",
  );
  await db
    .prepare("UPDATE caches SET expires_at=0 WHERE key=?")
    .bind(leaseKey)
    .run();
  await resetWindow();
  response(overpass, overpassPath, 200, { elements: [] });
  result = await osmSearch(13);
  check(
    result.status === 200 &&
      (
        await db
          .prepare("SELECT count(*) AS n FROM caches WHERE key=?")
          .bind(leaseKey)
          .first()
      ).n === 0,
    "Expired crash lease is reclaimed and released after a successful query",
  );
  upstream.assertNoPendingInterceptors();
  await mf.setOptions(options);
  await upstream.close();
}
