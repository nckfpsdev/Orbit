import { randomUUID } from "node:crypto";
export async function auditFeatures({
  request,
  check,
  db,
  boot,
  b,
  site,
  f,
  userHeaders,
  mf,
}) {
  check(
    (await request("/api/health", undefined, "alice", true)).status === 200,
    "Health checks the actual D1 connection",
  );
  const secured = await request("/api/v1/bootstrap", undefined, "alice", true);
  for (const header of [
    "X-Content-Type-Options",
    "Content-Security-Policy",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
    "X-Request-Id",
  ])
    check(secured.headers.has(header), `Global security header ${header}`);
  check(
    (await request("/api/v1/admin", undefined, "bob")).status === 403,
    "Common owner cannot access administrative APIs",
  );
  check(
    (await request("/api/v1/admin/credits", { amount: 100 }, "bob")).status ===
      403,
    "Common owner cannot mint credits even without paid APIs",
  );
  const snapshot = (await request(`/api/v1/leads/${b.id}`)).data.business;
  const key = randomUUID();
  const before = (await request("/api/v1/bootstrap")).data.organization.credits;
  const results = await Promise.all([
    request("/api/v1/websites", { business_id: b.id }, "alice", false, key),
    request("/api/v1/websites", { business_id: b.id }, "alice", false, key),
  ]);
  check(
    results.some((r) => r.status === 201) &&
      results.every((r) => [201, 409].includes(r.status)),
    "Duplicate operation key never runs generation twice",
  );
  const created = results.find((r) => r.status === 201);
  const replay = await request(
    "/api/v1/websites",
    { business_id: b.id },
    "alice",
    false,
    key,
  );
  check(
    replay.data.id === created.data.id,
    "Replay returns the persisted result",
  );
  const after = (await request("/api/v1/bootstrap")).data.organization.credits;
  check(before - after === 10, "An idempotent generation charges exactly once");
  check(
    (
      await request(
        "/api/v1/websites",
        { business_id: "different" },
        "alice",
        false,
        key,
      )
    ).status === 409,
    "Reusing key with a different payload is rejected",
  );
  await Promise.all([
    request("/api/v1/leads/save", { business_id: b.id, stage: "Negociação" }),
    request("/api/v1/leads/save", {
      business_id: b.id,
      notes: "Nota simultânea — café",
      tags: ["Confiança"],
    }),
  ]);
  const restored = (await request(`/api/v1/leads/${b.id}`)).data.business;
  check(
    restored.notes === "Nota simultânea — café" &&
      restored.tags[0] === "Confiança" &&
      restored.lead_status === "Negociação",
    "Concurrent field updates preserve notes, tags and stage",
  );
  const queue = await request("/api/v1/leads/batch", {
    ids: [b.id, b.id],
    action: "analyze",
  });
  check(
    queue.status === 200 && queue.data.queued === 1,
    "Duplicate batch IDs create a single job",
  );
  await Promise.all([
    request("/api/v1/jobs/process", {}),
    request("/api/v1/jobs/process", {}),
  ]);
  const job = await db
    .prepare("SELECT attempts,status FROM jobs WHERE id=?")
    .bind(queue.data.job_ids[0])
    .first();
  check(
    job.attempts === 1 && job.status === "completed",
    "Concurrent workers cannot reclaim completed work",
  );
  const huge = await mf.dispatchFetch("https://orbit.test/api/v1/export", {
    method: "POST",
    headers: { ...userHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: [b.id],
      fields: ["business_name"],
      format: "csv",
      extra: "á".repeat(45000),
    }),
  });
  check(huge.status === 413, "Body size is enforced on actual UTF-8 bytes");
  check(
    (
      await request(
        "/api/v1/export",
        { ids: [b.id], fields: ["business_name"], format: "csv" },
        "bob",
        true,
      )
    ).status === 404,
    "Export enforces organization ownership",
  );
  const missingCosts = { ...boot.data.settings, credit_costs: { search: 1 } };
  check(
    (await request("/api/v1/settings", missingCosts)).status === 422,
    "Incomplete financial configuration cannot make operations free",
  );
  const duplicateKey = randomUUID();
  const searches = await Promise.all([
    request("/api/v1/search", f, "alice", false, duplicateKey),
    request("/api/v1/search", f, "alice", false, duplicateKey),
  ]);
  check(
    searches.filter((r) => r.status === 200).length >= 1 &&
      searches.every((r) => [200, 409].includes(r.status)),
    "Concurrent search replay has one durable operation result",
  );
  const privateDraft = await request(
    `/preview/${created.data.slug}`,
    undefined,
    "alice",
    true,
  );
  check(
    privateDraft.status === 404,
    "Draft demonstration is not publicly readable",
  );
  const rendered = await request(
    `/preview/${site.data.slug}`,
    undefined,
    "alice",
    true,
  );
  check(
    rendered.headers
      .get("Content-Security-Policy")
      .includes("script-src 'none'"),
    "Generated previews cannot execute arbitrary scripts",
  );
  const date = new Date().toISOString();
  const bulkIds = [];
  for (let i = 0; i < 511; i++) {
    const id = `${boot.data.organization.id}_pagination_${i}`;
    bulkIds.push(id);
    const business = {
      ...snapshot,
      id,
      business_name: `Negócio fictício de teste ${i}`,
      lead_score: 100,
      saved: true,
      is_demo: true,
    };
    await db.batch([
      db
        .prepare(
          "INSERT INTO businesses (id,organization_id,business_name,category,source,website_status,lead_score,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          boot.data.organization.id,
          business.business_name,
          business.category,
          "mock",
          business.website_status,
          100,
          JSON.stringify(business),
          date,
          date,
        ),
      db
        .prepare(
          "INSERT INTO leads (id,organization_id,business_id,stage_id,stage,notes,tags_json,created_at,updated_at) VALUES (?,?,?,?,?,'','[]',?,?)",
        )
        .bind(
          `lead_${id}`,
          boot.data.organization.id,
          id,
          `${boot.data.organization.id}_stage_0`,
          "Descoberto",
          date,
          date,
        ),
    ]);
  }
  const page6 = await request("/api/v1/leads?saved=true&page=6&page_size=100");
  check(
    page6.status === 200 &&
      page6.data.total >= 512 &&
      page6.data.businesses.some((item) => item.id === b.id),
    "Saved low-score lead remains reachable beyond 500 records",
  );
  const filtered = await request(
    "/api/v1/leads?saved=true&page=1&page_size=100&q=fictício%20de%20teste",
  );
  check(
    filtered.data.total === 511,
    "CRM search runs across all pages on the server",
  );
  const list = await request("/api/v1/lists", {
    name: "Lista de regressão da paginação",
  });
  await db
    .prepare(
      "UPDATE leads SET list_id=? WHERE organization_id=? AND business_id=?",
    )
    .bind(list.data.id, boot.data.organization.id, bulkIds.at(-1))
    .run();
  const listPage = await request(
    `/api/v1/leads?saved=true&page=1&page_size=50&list_id=${list.data.id}`,
  );
  check(
    listPage.status === 200 &&
      listPage.data.total === 1 &&
      listPage.data.businesses[0].id === bulkIds.at(-1),
    "List filter finds saved leads beyond the bootstrap limit",
  );
  const foreignList = await request(
    `/api/v1/leads?saved=true&page=1&page_size=50&list_id=${list.data.id}`,
    undefined,
    "bob",
  );
  check(
    foreignList.status === 200 && foreignList.data.total === 0,
    "List filter cannot expose another organization leads",
  );
  for (let i = 0; i < bulkIds.length; i += 50) {
    const chunk = bulkIds.slice(i, i + 50);
    const q = chunk.map(() => "?").join(",");
    await db.batch([
      db
        .prepare(`DELETE FROM leads WHERE business_id IN (${q})`)
        .bind(...chunk),
      db.prepare(`DELETE FROM businesses WHERE id IN (${q})`).bind(...chunk),
    ]);
  }
  check(
    (await request(`/api/v1/leads/${b.id}`)).data.business.notes ===
      restored.notes,
    "Returning to a lead restores its persisted notes",
  );
}
