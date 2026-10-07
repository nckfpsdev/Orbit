import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
const timestamps = () => ({
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  ...timestamps(),
});
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    owner_id: text("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    credits: integer("credits").notNull().default(250),
    settings_json: text("settings_json").notNull(),
    initialized: integer("initialized").notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("idx_organizations_owner").on(t.owner_id)],
);
export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_memberships_org_user").on(t.organization_id, t.user_id),
  ],
);
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    country: text("country").notNull(),
    state: text("state").notNull(),
    city: text("city").notNull(),
    neighborhood: text("neighborhood"),
    postal_code: text("postal_code"),
    address: text("address"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
  },
  (t) => [index("idx_locations_org_city").on(t.organization_id, t.city)],
);
export const businesses = sqliteTable(
  "businesses",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    location_id: text("location_id").references(() => locations.id),
    business_name: text("business_name").notNull(),
    category: text("category").notNull(),
    source: text("source").notNull(),
    website_status: text("website_status").notNull(),
    lead_score: integer("lead_score").notNull(),
    data_json: text("data_json").notNull(),
    last_checked_at: text("last_checked_at"),
    ...timestamps(),
  },
  (t) => [
    index("idx_businesses_org_score").on(t.organization_id, t.lead_score),
    index("idx_businesses_org_source").on(t.organization_id, t.source),
  ],
);
export const businessSources = sqliteTable(
  "business_sources",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    provider: text("provider").notNull(),
    external_id: text("external_id").notNull(),
    source_url: text("source_url"),
    license: text("license").notNull(),
    can_export: integer("can_export").notNull(),
    checked_at: text("checked_at").notNull(),
  },
  (t) => [index("idx_sources_business").on(t.organization_id, t.business_id)],
);
export const digitalPresences = sqliteTable(
  "digital_presences",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    status: text("status").notNull(),
    evidence_json: text("evidence_json").notNull(),
    checked_at: text("checked_at").notNull(),
  },
  (t) => [index("idx_presence_business").on(t.organization_id, t.business_id)],
);
export const websiteAnalyses = sqliteTable(
  "website_analyses",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    url: text("url").notNull(),
    mode: text("mode").notNull(),
    data_json: text("data_json").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_audits_business").on(t.organization_id, t.business_id)],
);
export const searches = sqliteTable(
  "searches",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    filters_json: text("filters_json").notNull(),
    center_json: text("center_json").notNull(),
    provider: text("provider").notNull(),
    result_count: integer("result_count").notNull(),
    cached: integer("cached").notNull().default(0),
    status: text("status").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_searches_org_date").on(t.organization_id, t.created_at)],
);
export const searchResults = sqliteTable(
  "search_results",
  {
    id: text("id").primaryKey(),
    search_id: text("search_id")
      .notNull()
      .references(() => searches.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("idx_search_results_unique").on(t.search_id, t.business_id),
    index("idx_search_results_position").on(t.search_id, t.position),
  ],
);
export const crmStages = sqliteTable(
  "crm_stages",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [uniqueIndex("idx_stages_org_name").on(t.organization_id, t.name)],
);
export const leadLists = sqliteTable(
  "lead_lists",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_lists_org").on(t.organization_id)],
);
export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    stage_id: text("stage_id")
      .notNull()
      .references(() => crmStages.id),
    stage: text("stage").notNull(),
    list_id: text("list_id").references(() => leadLists.id),
    notes: text("notes").notNull().default(""),
    tags_json: text("tags_json").notNull().default("[]"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("idx_leads_org_business").on(t.organization_id, t.business_id),
    index("idx_leads_org_stage").on(t.organization_id, t.stage),
  ],
);
export const leadTags = sqliteTable(
  "lead_tags",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6956e8"),
  },
  (t) => [uniqueIndex("idx_tags_org_name").on(t.organization_id, t.name)],
);
export const leadTagLinks = sqliteTable(
  "lead_tag_links",
  {
    lead_id: text("lead_id")
      .notNull()
      .references(() => leads.id),
    tag_id: text("tag_id")
      .notNull()
      .references(() => leadTags.id),
  },
  (t) => [uniqueIndex("idx_lead_tag_pair").on(t.lead_id, t.tag_id)],
);
export const crmActivities = sqliteTable(
  "crm_activities",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    detail: text("detail").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_activity_org_date").on(t.organization_id, t.created_at)],
);
export const generatedWebsites = sqliteTable(
  "generated_websites",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    business_name: text("business_name").notNull(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull(),
    content_json: text("content_json").notNull(),
    engine: text("engine").notNull(),
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [index("idx_websites_org").on(t.organization_id)],
);
export const websiteVersions = sqliteTable(
  "website_versions",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    website_id: text("website_id")
      .notNull()
      .references(() => generatedWebsites.id),
    version: integer("version").notNull(),
    content_json: text("content_json").notNull(),
    change_note: text("change_note").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_versions_site").on(t.website_id, t.version)],
);
export const salesScripts = sqliteTable(
  "sales_scripts",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    business_name: text("business_name").notNull(),
    channel: text("channel").notNull(),
    kind: text("kind").notNull(),
    content: text("content").notNull(),
    engine: text("engine").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_scripts_org_date").on(t.organization_id, t.created_at)],
);
export const proposals = sqliteTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id),
    website_id: text("website_id").references(() => generatedWebsites.id),
    business_name: text("business_name").notNull(),
    price: real("price").notNull(),
    scope_json: text("scope_json").notNull(),
    evidence_json: text("evidence_json").notNull(),
    delivery_days: integer("delivery_days").notNull(),
    agency_name: text("agency_name").notNull(),
    status: text("status").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_proposals_org").on(t.organization_id)],
);
export const creditTransactions = sqliteTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    amount: integer("amount").notNull(),
    action: text("action").notNull(),
    reference_id: text("reference_id"),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_credits_org_date").on(t.organization_id, t.created_at)],
);
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    provider_reference: text("provider_reference"),
    period_end: text("period_end"),
    created_at: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_subscription_org").on(t.organization_id)],
);
export const providerUsage = sqliteTable(
  "provider_usage",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    provider: text("provider").notNull(),
    operation: text("operation").notNull(),
    units: integer("units").notNull(),
    estimated_cost: real("estimated_cost"),
    duration_ms: integer("duration_ms").notNull(),
    status: text("status").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_usage_org_date").on(t.organization_id, t.created_at)],
);
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    target_id: text("target_id"),
    detail: text("detail").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_logs_org_date").on(t.organization_id, t.created_at)],
);
export const caches = sqliteTable(
  "caches",
  {
    key: text("key").primaryKey(),
    organization_id: text("organization_id").references(() => organizations.id),
    value_json: text("value_json").notNull(),
    expires_at: integer("expires_at").notNull(),
  },
  (t) => [index("idx_cache_expiry").on(t.expires_at)],
);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires_at: integer("expires_at").notNull(),
});
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    kind: text("kind").notNull(),
    payload_json: text("payload_json").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    run_at: text("run_at").notNull(),
    locked_until: text("locked_until"),
    result_json: text("result_json"),
    error_code: text("error_code"),
    ...timestamps(),
  },
  (t) => [
    index("idx_jobs_org_status").on(t.organization_id, t.status, t.run_at),
  ],
);
export const monitors = sqliteTable(
  "monitors",
  {
    id: text("id").primaryKey(),
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    filters_json: text("filters_json").notNull(),
    enabled: integer("enabled").notNull().default(0),
    interval_hours: integer("interval_hours").notNull().default(24),
    next_run_at: text("next_run_at").notNull(),
    last_run_at: text("last_run_at"),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("idx_monitors_due").on(t.enabled, t.next_run_at)],
);

export const apiOperations = sqliteTable(
  "api_operations",
  {
    organization_id: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    operation_key: text("operation_key").notNull(),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").notNull(),
    response_json: text("response_json"),
    http_status: integer("http_status"),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_operations_org_key").on(
      t.organization_id,
      t.operation_key,
    ),
    index("idx_operations_date").on(t.created_at),
  ],
);
