import assert from "node:assert/strict";
import { auditFeatures } from "./worker-audit.mjs";
import { auditProviders } from "./provider-contracts.mjs";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve("wrangler/package.json"));
const { Miniflare } = wranglerRequire("miniflare");
async function modulesIn(dir, prefix = "") {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory())
      result.push(...(await modulesIn(resolve(dir, entry.name), name + "/")));
    else if (/\.m?js$/.test(entry.name))
      result.push({
        type: "ESModule",
        path: resolve(dir, entry.name),
        contents: await readFile(resolve(dir, entry.name), "utf8"),
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
const workerOptions = {
  name: "orbit-integration",
  modules,
  modulesRoot: resolve("dist/server"),
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "orbit-integration" },
  bindings: {
    APP_ORIGIN: "https://orbit.test",
    APP_ENV: "test",
    ADMIN_EMAILS: "alice@orbit.test",
  },
};
const mf = new Miniflare(workerOptions);
const db = await mf.getD1Database("DB");
const sqlFiles = (await readdir("drizzle"))
  .filter((x) => x.endsWith(".sql"))
  .sort();
for (const file of sqlFiles) {
  const sql = await readFile(`drizzle/${file}`, "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) await db.prepare(statement).run();
}
let checks = 0;
const userHeaders = (user = "alice") => ({
  "oai-authenticated-user-id": `test-${user}`,
  "oai-authenticated-user-email": `${user}@orbit.test`,
});
async function request(path, body, user = "alice", raw = false, operationKey) {
  const r = await mf.dispatchFetch(`https://orbit.test${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(operationKey ? { "Idempotency-Key": operationKey } : {}),
      ...userHeaders(user),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: "https://orbit.test" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (raw) return r;
  const parsed = await r.json();
  return { status: r.status, ...parsed };
}
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
try {
  const unauth = await mf.dispatchFetch("https://orbit.test/api/v1/bootstrap");
  check(
    unauth.status === 401,
    "Production APIs require authenticated identity: " +
      unauth.status +
      " " +
      (await unauth.text()).slice(0, 700),
  );
  const boot = await request("/api/v1/bootstrap");
  check(
    boot.status === 200,
    `Bootstrap succeeded: ${JSON.stringify(boot.error)}`,
  );
  check(
    boot.data.businesses.length === 24,
    "Development provider persists explicitly fictional records",
  );
  check(
    boot.data.organization.credits === 250,
    "Initial credit grant recorded",
  );
  check(
    boot.data.businesses.every((b) => b.is_demo),
    "Every fixture is marked fictitious",
  );
  const f = {
    country: "Brasil",
    state: "CE",
    city: "Fortaleza",
    neighborhood: "",
    postal_code: "",
    radius: 10,
    category: "Clínicas odontológicas",
    sub_category: "",
    query: "",
    provider: "mock",
    prioritize_no_site: true,
    website_filter: "no_own",
    min_rating: 0,
    min_reviews: 0,
    min_score: 0,
    has_phone: false,
    has_whatsapp: false,
    crm_status: "all",
    sort: "score",
  };
  const search = await request("/api/v1/search", f);
  check(
    search.status === 200,
    "State → city → niche → search returns businesses",
  );
  check(
    search.data.total > 0 && search.data.total < 24,
    "No-own-website filter excludes own domains",
  );
  check(search.data.credits_used === 1, "Search debits configurable credits");
  const restored = await request(`/api/v1/search/${search.data.id}`);
  check(
    restored.data.businesses.length === search.data.total,
    "History restores every bounded result, not just the first page",
  );
  const firstPage = await request(
    `/api/v1/search/${search.data.id}?page=1&page_size=3`,
  );
  const secondPage = await request(
    `/api/v1/search/${search.data.id}?page=2&page_size=3`,
  );
  check(
    firstPage.data.businesses.length === 3 &&
      secondPage.data.businesses[0].id !== firstPage.data.businesses[0].id,
    "Server pagination returns distinct pages",
  );
  const repeat = await request("/api/v1/search", f);
  check(
    repeat.data.cached && repeat.data.credits_used === 0,
    "Cache avoids redundant charges",
  );
  const b = search.data.businesses[0];
  const enriched = await request(`/api/v1/leads/${b.id}/enrich`, {});
  check(
    enriched.status === 200 && enriched.data.business.last_checked_at,
    "Enrichment updates evidence timestamp",
  );
  check(
    enriched.data.business.digital_presence.explanation.includes(
      "não confirma",
    ),
    "Analysis preserves uncertainty",
  );
  const list = await request("/api/v1/lists", {
    name: "Fortaleza — Clínicas sem site",
  });
  const saved = await request("/api/v1/leads/save", {
    business_id: b.id,
    stage: "Contato pendente",
    tags: ["Prioridade"],
    notes: "Contato a revisar",
    list_id: list.data.id,
  });
  check(
    saved.status === 200 && saved.data.saved,
    "Lead saved to persistent CRM",
  );
  check(saved.data.tags[0] === "Prioridade", "Tags persist");
  const moved = await request("/api/v1/leads/save", {
    business_id: b.id,
    stage: "Interessado",
  });
  check(moved.data.lead_status === "Interessado", "CRM stage changes persist");
  const site = await request("/api/v1/websites", { business_id: b.id });
  check(
    site.status === 201 && site.data.engine === "local",
    "Local generation is functional and explicitly identified",
  );
  const content = {
    ...site.data.content,
    headline: "Uma presença que aproxima.",
  };
  const edited = await request(`/api/v1/websites/${site.data.id}`, {
    content,
    version: 1,
  });
  check(
    edited.data.version === 2,
    "Website versions increment on content edits",
  );
  const conflict = await request(`/api/v1/websites/${site.data.id}`, {
    content,
    version: 1,
  });
  check(
    conflict.status === 409,
    "Concurrent stale edits cannot overwrite a version",
  );
  const published = await request(
    `/api/v1/websites/${site.data.id}/publish`,
    {},
  );
  check(
    published.data.status === "published",
    "Demonstration publication is persisted",
  );
  const preview = await request(
    `/preview/${site.data.slug}`,
    undefined,
    "alice",
    true,
  );
  const html = await preview.text();
  check(
    preview.status === 200 &&
      html.includes("Demonstração comercial — não é o site oficial da empresa"),
    "Preview is shareable within access policy and unmistakably commercial",
  );
  check(
    html.includes("Uma presença que aproxima."),
    "Published preview contains saved content",
  );
  const script = await request("/api/v1/scripts", {
    business_id: b.id,
    channel: "WhatsApp",
    kind: "first",
  });
  check(
    script.status === 201 && script.data.content.includes(b.business_name),
    "Contextual sales script generated",
  );
  const scriptEdit = await request(`/api/v1/scripts/${script.data.id}`, {
    content: script.data.content + " Obrigado.",
  });
  check(scriptEdit.status === 200, "Human script edits persist");
  const proposal = await request("/api/v1/proposals", {
    business_id: b.id,
    website_id: site.data.id,
    price: 2500,
    delivery_days: 15,
    scope: ["Site responsivo", "SEO local"],
  });
  check(
    proposal.status === 201 && proposal.data.price === 2500,
    "Proposal uses seller-provided price and measured evidence",
  );
  const csv = await request(
    "/api/v1/export",
    {
      ids: [b.id],
      fields: ["business_name", "source", "is_demo"],
      format: "csv",
    },
    "alice",
    true,
  );
  check(
    csv.status === 200 && (await csv.text()).includes("is_demo"),
    "CSV includes provenance and fictional marker",
  );
  const xlsx = await request(
    "/api/v1/export",
    { ids: [b.id], fields: ["business_name", "is_demo"], format: "xlsx" },
    "alice",
    true,
  );
  const bytes = new Uint8Array(await xlsx.arrayBuffer());
  check(
    xlsx.status === 200 && bytes[0] === 80 && bytes[1] === 75,
    "XLSX is an actual OpenXML ZIP file",
  );
  const bob = await request("/api/v1/bootstrap", undefined, "bob");
  check(
    bob.data.organization.id !== boot.data.organization.id,
    "Organizations are separated by authenticated identity",
  );
  check(
    bob.data.websites.length === 0 && bob.data.scripts.length === 0,
    "No generated data leaks across accounts",
  );
  check(
    (await request(`/api/v1/leads/${b.id}`, undefined, "bob")).status === 404,
    "Business detail enforces tenant ownership",
  );
  check(
    (await request(`/api/v1/websites/${site.data.id}`, undefined, "bob"))
      .status === 404,
    "Editor enforces tenant ownership",
  );
  check(
    (await request("/api/v1/leads/save", { business_id: b.id }, "bob"))
      .status === 404,
    "CRM writes enforce tenant ownership",
  );
  const bad = await request("/api/v1/search", {
    ...f,
    organization_id: bob.data.organization.id,
  });
  check(bad.status === 422, "Unexpected ownership fields are rejected");
  const origin = await mf.dispatchFetch(
    "https://orbit.test/api/v1/leads/save",
    {
      method: "POST",
      headers: {
        ...userHeaders(),
        "Content-Type": "application/json",
        Origin: "https://evil.test",
      },
      body: JSON.stringify({ business_id: b.id }),
    },
  );
  check(origin.status === 403, "Cross-origin writes are rejected");
  await auditFeatures({
    request,
    check,
    db,
    boot,
    b,
    site,
    f,
    userHeaders,
    mf,
  });
  const actual = await request(`/api/v1/leads/${b.id}`);
  const beforeRefund = await request("/api/v1/bootstrap");
  const broken = {
    ...actual.data.business,
    source: "licensed",
    last_checked_at: null,
  };
  await db
    .prepare("UPDATE businesses SET data_json=? WHERE id=?")
    .bind(JSON.stringify(broken), b.id)
    .run();
  const failed = await request(`/api/v1/leads/${b.id}/enrich`, {});
  check(failed.status === 503, "Provider configuration failure is explicit");
  const afterRefund = await request("/api/v1/bootstrap");
  check(
    beforeRefund.data.organization.credits ===
      afterRefund.data.organization.credits,
    "Failed enrichment refunds credits exactly",
  );
  await db
    .prepare("UPDATE businesses SET data_json=? WHERE id=?")
    .bind(JSON.stringify(actual.data.business), b.id)
    .run();
  await db
    .prepare("UPDATE organizations SET credits=10 WHERE id=?")
    .bind(boot.data.organization.id)
    .run();
  const concurrent = await Promise.all([
    request("/api/v1/websites", { business_id: b.id }),
    request("/api/v1/websites", { business_id: b.id }),
  ]);
  check(
    concurrent.filter((r) => r.status === 201).length === 1 &&
      concurrent.filter((r) => r.status === 402).length === 1,
    "Concurrent reservations cannot overspend credits",
  );
  const monitor = await request("/api/v1/monitors", {
    name: "Monitor pausado",
    filters: f,
    interval_hours: 24,
    enabled: false,
  });
  check(monitor.status === 201, "Periodic monitoring starts paused");
  check(
    (await request(`/api/v1/monitors/${monitor.data.id}`, { enabled: true }))
      .status === 503,
    "No false claim of active scheduler",
  );
  const admin = await request("/api/v1/admin");
  check(
    admin.status === 200 && admin.data.users.length === 1,
    "Admin is scoped to the current organization",
  );
  check(
    admin.data.cost_today.total === null,
    "Unconfigured costs are not fabricated",
  );
  for (const path of [
    "/",
    "/dashboard",
    "/opportunities",
    "/crm",
    "/lists",
    "/sites",
    "/history",
    "/scripts",
    "/settings",
    "/admin",
    "/onboarding",
    `/leads/${b.id}`,
    `/sites/${site.data.id}`,
    `/proposals/${proposal.data.id}`,
    "/privacy",
    "/terms",
    "/login",
  ]) {
    const page = await request(path, undefined, "alice", true);
    const html = await page.text();
    check(
      page.status === 200 && html.includes("<html"),
      `Server renders application route ${path}: ${page.status}`,
    );
  }
  await db
    .prepare(
      "INSERT OR REPLACE INTO rate_limits (key,count,expires_at) VALUES (?,?,?)",
    )
    .bind(
      `${boot.data.organization.id}:search`,
      12,
      Math.floor(Date.now() / 1000) + 60,
    )
    .run();
  check(
    (await request("/api/v1/search", f)).status === 429,
    "Search rate limit returns an explicit recoverable error",
  );
  check(
    (
      await request("/api/v1/workspace/delete-data", {
        confirmation: "confirmo",
      })
    ).status === 422,
    "Deletion requires exact user confirmation",
  );
  const deletion = await request("/api/v1/workspace/delete-data", {
    confirmation: "EXCLUIR",
  });
  check(
    deletion.status === 200,
    "Commercial deletion respects foreign-key order",
  );
  const erased = await request("/api/v1/bootstrap");
  const otherAfterDelete = await request("/api/v1/bootstrap", undefined, "bob");
  check(
    erased.data.stats.found === 0 &&
      erased.data.websites.length === 0 &&
      erased.data.scripts.length === 0 &&
      erased.data.proposals.length === 0,
    "Deletion removes commercial artifacts without reseeding",
  );
  check(
    otherAfterDelete.data.stats.found === 24,
    "Deletion cannot remove another organization data",
  );
  await auditProviders({
    mf,
    db,
    options: workerOptions,
    request,
    check,
    settings: f,
  });
  await mf.setOptions({
    ...workerOptions,
    bindings: {
      APP_ORIGIN: "https://orbit.test",
      GEMINI_API_KEY: "test-unused-credential",
    },
  });
  const paidBoot = await request("/api/v1/bootstrap");
  check(
    paidBoot.data.businesses.length === 0 &&
      !paidBoot.data.provider_status.mock,
    "Production hides fixtures and disables the mock provider",
  );
  const carol = await request("/api/v1/bootstrap", undefined, "carol");
  check(
    carol.data.businesses.length === 0 &&
      carol.data.settings.provider === "osm",
    "New production workspace never seeds fixtures",
  );
  check(
    (await request("/api/v1/search", f, "carol")).status === 403,
    "Production blocks explicit mock searches on the server",
  );
  check(
    (await request("/api/v1/admin", undefined, "bob")).status === 403,
    "Workspace owner is not a platform administrator",
  );
  check(
    (await request("/admin", undefined, "bob", true)).status === 404,
    "Direct admin page is protected on the server",
  );
  check(
    (await request("/api/v1/bootstrap", undefined, "bob")).data.stats.found ===
      0,
    "Existing test records are excluded from production aggregates",
  );
  check(
    !paidBoot.data.provider_status.manage_credits,
    "Production never permits self-service credit grants without an admin allowlist",
  );
  check(
    (await request("/api/v1/admin/credits", { amount: 250 })).status === 403,
    "Credit grant cannot bypass paid integration restrictions",
  );
  check(
    (
      await request("/api/v1/settings", {
        ...paidBoot.data.settings,
        credit_costs: { ...paidBoot.data.settings.credit_costs, website: 0 },
      })
    ).status === 403,
    "Customer cannot make paid generations free by changing credit costs",
  );
  check(
    (
      await request("/api/v1/settings", {
        ...paidBoot.data.settings,
        sender_name: "Alice",
      })
    ).status === 200,
    "Financial restrictions preserve regular workspace settings",
  );
  console.log(
    JSON.stringify({
      status: "passed",
      checks,
      flow: "Pesquisa → análise → site → abordagem → CRM → proposta → exportação",
      runtime: "Production Worker + D1",
    }),
  );
} finally {
  await mf.dispose();
}
