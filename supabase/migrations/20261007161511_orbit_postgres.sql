-- PostgreSQL semantic migration: JSONB, UTC timestamps, booleans, tenant constraints and RLS.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='orbit_backend') THEN CREATE ROLE orbit_backend NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; END IF; END $$;
GRANT USAGE ON SCHEMA public, private TO orbit_backend;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;


CREATE TABLE public."audit_logs" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "action" text NOT NULL,
  "target_id" text,
  "detail" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."business_sources" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "provider" text NOT NULL,
  "external_id" text NOT NULL,
  "source_url" text,
  "license" text NOT NULL,
  "can_export" boolean NOT NULL,
  "checked_at" timestamptz NOT NULL,
  UNIQUE (organization_id,id)
);

CREATE TABLE public."businesses" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "location_id" text,
  "business_name" text NOT NULL,
  "category" text NOT NULL,
  "source" text NOT NULL,
  "website_status" text NOT NULL,
  "lead_score" integer NOT NULL,
  "data_json" jsonb NOT NULL,
  "last_checked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id),
  CHECK (lead_score BETWEEN 0 AND 100)
);

CREATE TABLE public."caches" (
  "key" text PRIMARY KEY,
  "organization_id" text,
  "value_json" jsonb NOT NULL,
  "expires_at" bigint NOT NULL
);

CREATE TABLE public."credit_transactions" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "amount" integer NOT NULL,
  "action" text NOT NULL,
  "reference_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."crm_activities" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "user_id" text NOT NULL,
  "action" text NOT NULL,
  "detail" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."crm_stages" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "position" integer NOT NULL,
  UNIQUE (organization_id,id)
);

CREATE TABLE public."digital_presences" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "status" text NOT NULL,
  "evidence_json" jsonb NOT NULL,
  "checked_at" timestamptz NOT NULL,
  UNIQUE (organization_id,id)
);

CREATE TABLE public."generated_websites" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "business_name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text NOT NULL,
  "content_json" jsonb NOT NULL,
  "engine" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."jobs" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "kind" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "status" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "run_at" timestamptz NOT NULL,
  "locked_until" timestamptz,
  "result_json" jsonb,
  "error_code" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."lead_lists" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."lead_tag_links" (
  "lead_id" text NOT NULL,
  "tag_id" text NOT NULL,
  organization_id text NOT NULL,
  PRIMARY KEY (lead_id,tag_id)
);

CREATE TABLE public."lead_tags" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#6956e8',
  UNIQUE (organization_id,id)
);

CREATE TABLE public."leads" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "stage_id" text NOT NULL,
  "stage" text NOT NULL,
  "list_id" text,
  "notes" text NOT NULL DEFAULT '',
  "tags_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."locations" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "country" text NOT NULL,
  "state" text NOT NULL,
  "city" text NOT NULL,
  "neighborhood" text,
  "postal_code" text,
  "address" text,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  UNIQUE (organization_id,id),
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE public."memberships" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."monitors" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "filters_json" jsonb NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "interval_hours" integer NOT NULL DEFAULT 24,
  "next_run_at" timestamptz NOT NULL,
  "last_run_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."organizations" (
  "id" text PRIMARY KEY,
  "owner_id" text NOT NULL,
  "name" text NOT NULL,
  "credits" integer NOT NULL DEFAULT 250,
  "settings_json" jsonb NOT NULL,
  "initialized" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CHECK (credits >= 0)
);

CREATE TABLE public."proposals" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "website_id" text,
  "business_name" text NOT NULL,
  "price" numeric(14,4) NOT NULL,
  "scope_json" jsonb NOT NULL,
  "evidence_json" jsonb NOT NULL,
  "delivery_days" integer NOT NULL,
  "agency_name" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."provider_usage" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "provider" text NOT NULL,
  "operation" text NOT NULL,
  "units" integer NOT NULL,
  "estimated_cost" numeric(14,4),
  "duration_ms" integer NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."rate_limits" (
  "key" text PRIMARY KEY,
  "count" integer NOT NULL,
  "expires_at" bigint NOT NULL
);

CREATE TABLE public."sales_scripts" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "business_name" text NOT NULL,
  "channel" text NOT NULL,
  "kind" text NOT NULL,
  "content" text NOT NULL,
  "engine" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."search_results" (
  "id" text PRIMARY KEY,
  "search_id" text NOT NULL,
  "business_id" text NOT NULL,
  "position" integer NOT NULL,
  organization_id text NOT NULL
);

CREATE TABLE public."searches" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "filters_json" jsonb NOT NULL,
  "center_json" jsonb NOT NULL,
  "provider" text NOT NULL,
  "result_count" integer NOT NULL,
  "cached" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."subscriptions" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "plan" text NOT NULL,
  "status" text NOT NULL,
  "provider_reference" text,
  "period_end" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."users" (
  "id" text PRIMARY KEY,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public."website_analyses" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "business_id" text NOT NULL,
  "url" text NOT NULL,
  "mode" text NOT NULL,
  "data_json" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."website_versions" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "website_id" text NOT NULL,
  "version" integer NOT NULL,
  "content_json" jsonb NOT NULL,
  "change_note" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);

CREATE TABLE public."api_operations" (
  "organization_id" text NOT NULL,
  "operation_key" text NOT NULL,
  "fingerprint" text NOT NULL,
  "status" text NOT NULL,
  "response_json" text,
  "http_status" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id,operation_key)
);

ALTER TABLE public."audit_logs" ADD CONSTRAINT "fk_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES public."users" ("id");

ALTER TABLE public."audit_logs" ADD CONSTRAINT "fk_audit_logs_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_logs_org_date" ON public."audit_logs" ("organization_id","created_at");

ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."business_sources" ADD CONSTRAINT "fk_business_sources_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."business_sources" ADD CONSTRAINT "fk_business_sources_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_sources_business" ON public."business_sources" ("organization_id","business_id");

ALTER TABLE public."business_sources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."businesses" ADD CONSTRAINT "fk_businesses_location_id" FOREIGN KEY (organization_id,"location_id") REFERENCES public."locations" (organization_id,"id");

ALTER TABLE public."businesses" ADD CONSTRAINT "fk_businesses_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_businesses_org_source" ON public."businesses" ("organization_id","source");

CREATE INDEX "idx_businesses_org_score" ON public."businesses" ("organization_id","lead_score");

ALTER TABLE public."businesses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."caches" ADD CONSTRAINT "fk_caches_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_cache_expiry" ON public."caches" ("expires_at");

ALTER TABLE public."caches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."credit_transactions" ADD CONSTRAINT "fk_credit_transactions_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_credits_org_date" ON public."credit_transactions" ("organization_id","created_at");

ALTER TABLE public."credit_transactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."crm_activities" ADD CONSTRAINT "fk_crm_activities_user_id" FOREIGN KEY ("user_id") REFERENCES public."users" ("id");

ALTER TABLE public."crm_activities" ADD CONSTRAINT "fk_crm_activities_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."crm_activities" ADD CONSTRAINT "fk_crm_activities_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_activity_org_date" ON public."crm_activities" ("organization_id","created_at");

ALTER TABLE public."crm_activities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."crm_stages" ADD CONSTRAINT "fk_crm_stages_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE UNIQUE INDEX "idx_stages_org_name" ON public."crm_stages" ("organization_id","name");

ALTER TABLE public."crm_stages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."digital_presences" ADD CONSTRAINT "fk_digital_presences_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."digital_presences" ADD CONSTRAINT "fk_digital_presences_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_presence_business" ON public."digital_presences" ("organization_id","business_id");

ALTER TABLE public."digital_presences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."generated_websites" ADD CONSTRAINT "fk_generated_websites_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."generated_websites" ADD CONSTRAINT "fk_generated_websites_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_websites_org" ON public."generated_websites" ("organization_id");

CREATE UNIQUE INDEX "generated_websites_slug_unique" ON public."generated_websites" ("slug");

ALTER TABLE public."generated_websites" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."jobs" ADD CONSTRAINT "fk_jobs_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_jobs_org_status" ON public."jobs" ("organization_id","status","run_at");

ALTER TABLE public."jobs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."lead_lists" ADD CONSTRAINT "fk_lead_lists_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_lists_org" ON public."lead_lists" ("organization_id");

ALTER TABLE public."lead_lists" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."lead_tag_links" ADD CONSTRAINT "fk_lead_tag_links_tag_id" FOREIGN KEY (organization_id,"tag_id") REFERENCES public."lead_tags" (organization_id,"id");

ALTER TABLE public."lead_tag_links" ADD CONSTRAINT "fk_lead_tag_links_lead_id" FOREIGN KEY (organization_id,"lead_id") REFERENCES public."leads" (organization_id,"id");

ALTER TABLE public."lead_tag_links" ADD CONSTRAINT "fk_lead_tag_links_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

ALTER TABLE public."lead_tag_links" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."lead_tags" ADD CONSTRAINT "fk_lead_tags_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE UNIQUE INDEX "idx_tags_org_name" ON public."lead_tags" ("organization_id","name");

ALTER TABLE public."lead_tags" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."leads" ADD CONSTRAINT "fk_leads_list_id" FOREIGN KEY (organization_id,"list_id") REFERENCES public."lead_lists" (organization_id,"id");

ALTER TABLE public."leads" ADD CONSTRAINT "fk_leads_stage_id" FOREIGN KEY (organization_id,"stage_id") REFERENCES public."crm_stages" (organization_id,"id");

ALTER TABLE public."leads" ADD CONSTRAINT "fk_leads_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."leads" ADD CONSTRAINT "fk_leads_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_leads_org_stage" ON public."leads" ("organization_id","stage");

CREATE UNIQUE INDEX "idx_leads_org_business" ON public."leads" ("organization_id","business_id");

ALTER TABLE public."leads" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."locations" ADD CONSTRAINT "fk_locations_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_locations_org_city" ON public."locations" ("organization_id","city");

ALTER TABLE public."locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."memberships" ADD CONSTRAINT "fk_memberships_user_id" FOREIGN KEY ("user_id") REFERENCES public."users" ("id");

ALTER TABLE public."memberships" ADD CONSTRAINT "fk_memberships_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE UNIQUE INDEX "idx_memberships_org_user" ON public."memberships" ("organization_id","user_id");

ALTER TABLE public."memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."monitors" ADD CONSTRAINT "fk_monitors_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_monitors_due" ON public."monitors" ("enabled","next_run_at");

ALTER TABLE public."monitors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."organizations" ADD CONSTRAINT "fk_organizations_owner_id" FOREIGN KEY ("owner_id") REFERENCES public."users" ("id");

CREATE UNIQUE INDEX "idx_organizations_owner" ON public."organizations" ("owner_id");

ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."proposals" ADD CONSTRAINT "fk_proposals_website_id" FOREIGN KEY (organization_id,"website_id") REFERENCES public."generated_websites" (organization_id,"id");

ALTER TABLE public."proposals" ADD CONSTRAINT "fk_proposals_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."proposals" ADD CONSTRAINT "fk_proposals_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_proposals_org" ON public."proposals" ("organization_id");

ALTER TABLE public."proposals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."provider_usage" ADD CONSTRAINT "fk_provider_usage_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_usage_org_date" ON public."provider_usage" ("organization_id","created_at");

ALTER TABLE public."provider_usage" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."rate_limits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."sales_scripts" ADD CONSTRAINT "fk_sales_scripts_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."sales_scripts" ADD CONSTRAINT "fk_sales_scripts_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_scripts_org_date" ON public."sales_scripts" ("organization_id","created_at");

ALTER TABLE public."sales_scripts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."search_results" ADD CONSTRAINT "fk_search_results_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."search_results" ADD CONSTRAINT "fk_search_results_search_id" FOREIGN KEY (organization_id,"search_id") REFERENCES public."searches" (organization_id,"id");

ALTER TABLE public."search_results" ADD CONSTRAINT "fk_search_results_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_search_results_position" ON public."search_results" ("search_id","position");

CREATE UNIQUE INDEX "idx_search_results_unique" ON public."search_results" ("search_id","business_id");

ALTER TABLE public."search_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."searches" ADD CONSTRAINT "fk_searches_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_searches_org_date" ON public."searches" ("organization_id","created_at");

ALTER TABLE public."searches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."subscriptions" ADD CONSTRAINT "fk_subscriptions_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE UNIQUE INDEX "idx_subscription_org" ON public."subscriptions" ("organization_id");

ALTER TABLE public."subscriptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."website_analyses" ADD CONSTRAINT "fk_website_analyses_business_id" FOREIGN KEY (organization_id,"business_id") REFERENCES public."businesses" (organization_id,"id");

ALTER TABLE public."website_analyses" ADD CONSTRAINT "fk_website_analyses_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_audits_business" ON public."website_analyses" ("organization_id","business_id");

ALTER TABLE public."website_analyses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."website_versions" ADD CONSTRAINT "fk_website_versions_website_id" FOREIGN KEY (organization_id,"website_id") REFERENCES public."generated_websites" (organization_id,"id");

ALTER TABLE public."website_versions" ADD CONSTRAINT "fk_website_versions_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE UNIQUE INDEX "idx_versions_site" ON public."website_versions" ("website_id","version");

ALTER TABLE public."website_versions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."api_operations" ADD CONSTRAINT "fk_api_operations_organization_id" FOREIGN KEY ("organization_id") REFERENCES public."organizations" ("id");

CREATE INDEX "idx_operations_date" ON public."api_operations" ("created_at");

ALTER TABLE public."api_operations" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_users_email ON public.users (lower(email));
CREATE INDEX idx_memberships_user ON public.memberships (user_id,organization_id);
CREATE INDEX idx_search_results_business ON public.search_results (organization_id,business_id);
CREATE INDEX idx_tag_links_tag ON public.lead_tag_links (organization_id,tag_id);
CREATE INDEX idx_proposals_site ON public.proposals (organization_id,website_id);
CREATE INDEX idx_leads_list ON public.leads (organization_id,list_id);
CREATE INDEX idx_sources_external ON public.business_sources (organization_id,provider,external_id);
CREATE OR REPLACE FUNCTION private.session_valid() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id::text=auth.jwt()->>'session_id' AND s.user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION private.session_valid() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.session_valid() TO authenticated,orbit_backend;
CREATE OR REPLACE FUNCTION private.is_member(target_org text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.session_valid() AND EXISTS (SELECT 1 FROM public.users u JOIN public.memberships m ON m.user_id=u.id WHERE u.auth_user_id=auth.uid() AND m.organization_id=target_org);
$$;
REVOKE ALL ON FUNCTION private.is_member(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.is_member(text) TO authenticated,orbit_backend;
CREATE OR REPLACE FUNCTION private.owns_org(target_org text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.session_valid() AND EXISTS (SELECT 1 FROM public.users u JOIN public.organizations o ON o.owner_id=u.id WHERE u.auth_user_id=auth.uid() AND o.id=target_org);
$$;
REVOKE ALL ON FUNCTION private.owns_org(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.owns_org(text) TO authenticated,orbit_backend;


CREATE POLICY tenant_read ON public."audit_logs" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."audit_logs" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."audit_logs" TO orbit_backend;

GRANT SELECT ON public."audit_logs" TO authenticated;

CREATE POLICY tenant_read ON public."business_sources" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."business_sources" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."business_sources" TO orbit_backend;

GRANT SELECT ON public."business_sources" TO authenticated;

CREATE POLICY tenant_read ON public."businesses" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."businesses" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."businesses" TO orbit_backend;

GRANT SELECT ON public."businesses" TO authenticated;

CREATE POLICY tenant_read ON public."caches" FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND private.is_member(organization_id));

CREATE POLICY backend_access ON public."caches" FOR ALL TO orbit_backend USING ((organization_id IS NULL OR private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((organization_id IS NULL OR private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."caches" TO orbit_backend;

CREATE POLICY tenant_read ON public."credit_transactions" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."credit_transactions" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."credit_transactions" TO orbit_backend;

GRANT SELECT ON public."credit_transactions" TO authenticated;

CREATE POLICY tenant_read ON public."crm_activities" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."crm_activities" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."crm_activities" TO orbit_backend;

GRANT SELECT ON public."crm_activities" TO authenticated;

CREATE POLICY tenant_read ON public."crm_stages" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."crm_stages" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."crm_stages" TO orbit_backend;

GRANT SELECT ON public."crm_stages" TO authenticated;

CREATE POLICY tenant_read ON public."digital_presences" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."digital_presences" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."digital_presences" TO orbit_backend;

GRANT SELECT ON public."digital_presences" TO authenticated;

CREATE POLICY tenant_read ON public."generated_websites" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."generated_websites" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."generated_websites" TO orbit_backend;

GRANT SELECT ON public."generated_websites" TO authenticated;

CREATE POLICY tenant_read ON public."jobs" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."jobs" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."jobs" TO orbit_backend;

CREATE POLICY tenant_read ON public."lead_lists" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."lead_lists" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."lead_lists" TO orbit_backend;

GRANT SELECT ON public."lead_lists" TO authenticated;

CREATE POLICY tenant_insert ON public."lead_lists" FOR INSERT TO authenticated WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_update ON public."lead_lists" FOR UPDATE TO authenticated USING (private.is_member(organization_id)) WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_delete ON public."lead_lists" FOR DELETE TO authenticated USING (private.is_member(organization_id));

GRANT INSERT,UPDATE,DELETE ON public."lead_lists" TO authenticated;

CREATE POLICY tenant_read ON public."lead_tag_links" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."lead_tag_links" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."lead_tag_links" TO orbit_backend;

GRANT SELECT ON public."lead_tag_links" TO authenticated;

CREATE POLICY tenant_insert ON public."lead_tag_links" FOR INSERT TO authenticated WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_update ON public."lead_tag_links" FOR UPDATE TO authenticated USING (private.is_member(organization_id)) WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_delete ON public."lead_tag_links" FOR DELETE TO authenticated USING (private.is_member(organization_id));

GRANT INSERT,UPDATE,DELETE ON public."lead_tag_links" TO authenticated;

CREATE POLICY tenant_read ON public."lead_tags" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."lead_tags" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."lead_tags" TO orbit_backend;

GRANT SELECT ON public."lead_tags" TO authenticated;

CREATE POLICY tenant_insert ON public."lead_tags" FOR INSERT TO authenticated WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_update ON public."lead_tags" FOR UPDATE TO authenticated USING (private.is_member(organization_id)) WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_delete ON public."lead_tags" FOR DELETE TO authenticated USING (private.is_member(organization_id));

GRANT INSERT,UPDATE,DELETE ON public."lead_tags" TO authenticated;

CREATE POLICY tenant_read ON public."leads" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."leads" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."leads" TO orbit_backend;

GRANT SELECT ON public."leads" TO authenticated;

CREATE POLICY tenant_insert ON public."leads" FOR INSERT TO authenticated WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_update ON public."leads" FOR UPDATE TO authenticated USING (private.is_member(organization_id)) WITH CHECK (private.is_member(organization_id));

CREATE POLICY tenant_delete ON public."leads" FOR DELETE TO authenticated USING (private.is_member(organization_id));

GRANT INSERT,UPDATE,DELETE ON public."leads" TO authenticated;

CREATE POLICY tenant_read ON public."locations" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."locations" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."locations" TO orbit_backend;

GRANT SELECT ON public."locations" TO authenticated;

CREATE POLICY tenant_read ON public."memberships" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."memberships" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."memberships" TO orbit_backend;

GRANT SELECT ON public."memberships" TO authenticated;

CREATE POLICY tenant_read ON public."monitors" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."monitors" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."monitors" TO orbit_backend;

CREATE POLICY tenant_read ON public."organizations" FOR SELECT TO authenticated USING (private.owns_org(id) OR private.is_member(id));

CREATE POLICY backend_access ON public."organizations" FOR ALL TO orbit_backend USING ((private.owns_org(id) OR private.is_member(id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.owns_org(id) OR private.is_member(id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."organizations" TO orbit_backend;

GRANT SELECT ON public."organizations" TO authenticated;

CREATE POLICY tenant_read ON public."proposals" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."proposals" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."proposals" TO orbit_backend;

GRANT SELECT ON public."proposals" TO authenticated;

CREATE POLICY tenant_read ON public."provider_usage" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."provider_usage" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."provider_usage" TO orbit_backend;

GRANT SELECT ON public."provider_usage" TO authenticated;

CREATE POLICY tenant_read ON public."rate_limits" FOR SELECT TO authenticated USING (false);

CREATE POLICY backend_access ON public."rate_limits" FOR ALL TO orbit_backend USING ((true) OR current_setting('orbit.system',true)='true') WITH CHECK ((true) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."rate_limits" TO orbit_backend;

CREATE POLICY tenant_read ON public."sales_scripts" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."sales_scripts" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."sales_scripts" TO orbit_backend;

GRANT SELECT ON public."sales_scripts" TO authenticated;

CREATE POLICY tenant_read ON public."search_results" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."search_results" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."search_results" TO orbit_backend;

GRANT SELECT ON public."search_results" TO authenticated;

CREATE POLICY tenant_read ON public."searches" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."searches" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."searches" TO orbit_backend;

GRANT SELECT ON public."searches" TO authenticated;

CREATE POLICY tenant_read ON public."subscriptions" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."subscriptions" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."subscriptions" TO orbit_backend;

GRANT SELECT ON public."subscriptions" TO authenticated;

CREATE POLICY tenant_read ON public."users" FOR SELECT TO authenticated USING (auth_user_id=(select auth.uid()) AND (select private.session_valid()));

CREATE POLICY backend_access ON public."users" FOR ALL TO orbit_backend USING ((auth_user_id=(select auth.uid()) AND (select private.session_valid())) OR current_setting('orbit.system',true)='true') WITH CHECK ((auth_user_id=(select auth.uid()) AND (select private.session_valid())) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."users" TO orbit_backend;

GRANT SELECT ON public."users" TO authenticated;

CREATE POLICY tenant_read ON public."website_analyses" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."website_analyses" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."website_analyses" TO orbit_backend;

GRANT SELECT ON public."website_analyses" TO authenticated;

CREATE POLICY tenant_read ON public."website_versions" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."website_versions" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."website_versions" TO orbit_backend;

GRANT SELECT ON public."website_versions" TO authenticated;

CREATE POLICY tenant_read ON public."api_operations" FOR SELECT TO authenticated USING (private.is_member(organization_id));

CREATE POLICY backend_access ON public."api_operations" FOR ALL TO orbit_backend USING ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true') WITH CHECK ((private.is_member(organization_id)) OR current_setting('orbit.system',true)='true');

GRANT SELECT,INSERT,UPDATE,DELETE ON public."api_operations" TO orbit_backend;

-- Only the verified application server may provision/claim a workspace. No password is migrated.
CREATE OR REPLACE FUNCTION private.bootstrap_profile(p_user uuid,p_email text,p_name text,p_settings jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user text; v_org text;
BEGIN
 IF p_user IS DISTINCT FROM auth.uid() OR NOT private.session_valid() OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=lower(p_email) AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Identity not verified' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 SELECT id INTO v_user FROM public.users WHERE auth_user_id=p_user;
 IF v_user IS NULL THEN
  SELECT id INTO v_user FROM public.users WHERE auth_user_id IS NULL AND lower(email)=lower(p_email) FOR UPDATE;
  IF v_user IS NOT NULL THEN UPDATE public.users SET auth_user_id=p_user,updated_at=now() WHERE id=v_user;
  ELSE v_user:=p_user::text; INSERT INTO public.users(id,auth_user_id,email,name) VALUES(v_user,p_user,p_email,p_name); END IF;
 END IF;
 SELECT id INTO v_org FROM public.organizations WHERE owner_id=v_user;
 IF v_org IS NULL THEN
  v_org:='org_'||replace(gen_random_uuid()::text,'-','');
  INSERT INTO public.organizations(id,owner_id,name,credits,settings_json,initialized) VALUES(v_org,v_user,'Meu workspace',250,p_settings,false);
 END IF;
 INSERT INTO public.memberships(id,organization_id,user_id,role) VALUES(v_org||'_owner',v_org,v_user,'owner') ON CONFLICT(organization_id,user_id) DO NOTHING;
 RETURN jsonb_build_object('user_id',v_user,'organization_id',v_org);
END $$;
REVOKE ALL ON FUNCTION private.bootstrap_profile(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.bootstrap_profile(uuid,text,text,jsonb) TO orbit_backend;
-- Published HTML contains only reviewed commercial content; private CRM data is never returned.
CREATE OR REPLACE FUNCTION private.published_website(p_slug text) RETURNS TABLE(content_json jsonb,is_demo boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT w.content_json,COALESCE((b.data_json->>'is_demo')::boolean,false) FROM public.generated_websites w JOIN public.businesses b ON b.id=w.business_id AND b.organization_id=w.organization_id WHERE w.slug=p_slug AND w.status='published' AND b.source<>'mock';
$$;
REVOKE ALL ON FUNCTION private.published_website(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.published_website(text) TO orbit_backend;

-- Provision a narrowly scoped runtime credential without putting a password in migrations or SQL logs.
-- This maintenance function is unavailable to application and Data API roles.
CREATE FUNCTION private.provision_backend_connection() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE secret text := replace(gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text,'-','');
BEGIN
  EXECUTE format('ALTER ROLE orbit_backend LOGIN PASSWORD %L',secret);
  RETURN secret;
END $$;
REVOKE ALL ON FUNCTION private.provision_backend_connection() FROM PUBLIC,anon,authenticated,orbit_backend;
GRANT EXECUTE ON FUNCTION private.provision_backend_connection() TO postgres;
