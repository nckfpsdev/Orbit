// Optional live application smoke: invoke only after Preview is authorized.
import assert from "node:assert/strict";
const origin = process.env.ORBIT_SMOKE_APP_ORIGIN;
const token = process.env.ORBIT_SMOKE_ACCESS_TOKEN;
if (!origin || !token)
  throw new Error(
    "Configure ORBIT_SMOKE_APP_ORIGIN e uma sessão Supabase real no secret store; nenhum token deve ser escrito no chat.",
  );
const base = new URL(origin);
if (base.protocol !== "https:" || base.username || base.password)
  throw new Error("ORBIT_SMOKE_APP_ORIGIN_INVALID");
const { DEFAULT_FILTERS } = await import("../lib/domain/constants.ts");
const { searchSchema } = await import("../lib/server/validation.ts");
const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + token,
  Origin: base.origin,
};
for (const category of ["Restaurantes", "Farmácias"]) {
  const filters = searchSchema.parse({
    ...DEFAULT_FILTERS,
    provider: "osm",
    country: "Brasil",
    state: "CE",
    city: "Fortaleza",
    postal_code: "60160-230",
    radius: 1,
    category,
    website_filter: "all",
    prioritize_no_site: true,
  });
  const response = await fetch(new URL("/api/v1/search", base), {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(filters),
    signal: AbortSignal.timeout(90000),
    redirect: "manual",
  });
  if (!response.ok) throw new Error(`LIVE_SEARCH_HTTP_${response.status}`);
  const payload = await response.json();
  const result = payload.data;
  assert.equal(result.is_demo, false);
  assert.equal(result.filters.provider, "osm");
  assert.ok(
    result.businesses.length > 0,
    "Nenhum resultado real para a consulta.",
  );
  for (const item of result.businesses) {
    assert.equal(item.source, "osm");
    assert.equal(item.is_demo, false);
    assert.ok(item.business_name);
    assert.ok(
      Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
    );
  }
  const lead = await fetch(
    new URL(
      "/api/v1/leads/" + encodeURIComponent(result.businesses[0].id),
      base,
    ),
    {
      headers: { Authorization: headers.Authorization },
      signal: AbortSignal.timeout(30000),
      redirect: "manual",
    },
  );
  assert.equal(lead.status, 200);
  console.log(
    JSON.stringify({
      category,
      count: result.businesses.length,
      provider: "osm",
      lead_read: "PASS",
    }),
  );
  // Match the provider's global interval; sequential requests only.
  if (category === "Restaurantes")
    await new Promise((resolve) => setTimeout(resolve, 11000));
}
