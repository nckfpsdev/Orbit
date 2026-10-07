CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_logs_org_date` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `business_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`source_url` text,
	`license` text NOT NULL,
	`can_export` integer NOT NULL,
	`checked_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sources_business` ON `business_sources` (`organization_id`,`business_id`);--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`location_id` text,
	`business_name` text NOT NULL,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`website_status` text NOT NULL,
	`lead_score` integer NOT NULL,
	`data_json` text NOT NULL,
	`last_checked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_businesses_org_score` ON `businesses` (`organization_id`,`lead_score`);--> statement-breakpoint
CREATE INDEX `idx_businesses_org_source` ON `businesses` (`organization_id`,`source`);--> statement-breakpoint
CREATE TABLE `caches` (
	`key` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`value_json` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cache_expiry` ON `caches` (`expires_at`);--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`amount` integer NOT NULL,
	`action` text NOT NULL,
	`reference_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_credits_org_date` ON `credit_transactions` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `crm_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activity_org_date` ON `crm_activities` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `crm_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stages_org_name` ON `crm_stages` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `digital_presences` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`status` text NOT NULL,
	`evidence_json` text NOT NULL,
	`checked_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_presence_business` ON `digital_presences` (`organization_id`,`business_id`);--> statement-breakpoint
CREATE TABLE `generated_websites` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`business_name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`content_json` text NOT NULL,
	`engine` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generated_websites_slug_unique` ON `generated_websites` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_websites_org` ON `generated_websites` (`organization_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`run_at` text NOT NULL,
	`locked_until` text,
	`result_json` text,
	`error_code` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_org_status` ON `jobs` (`organization_id`,`status`,`run_at`);--> statement-breakpoint
CREATE TABLE `lead_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lists_org` ON `lead_lists` (`organization_id`);--> statement-breakpoint
CREATE TABLE `lead_tag_links` (
	`lead_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `lead_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lead_tag_pair` ON `lead_tag_links` (`lead_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `lead_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6956e8' NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_org_name` ON `lead_tags` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`stage` text NOT NULL,
	`list_id` text,
	`notes` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `crm_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`list_id`) REFERENCES `lead_lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_org_business` ON `leads` (`organization_id`,`business_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_org_stage` ON `leads` (`organization_id`,`stage`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`country` text NOT NULL,
	`state` text NOT NULL,
	`city` text NOT NULL,
	`neighborhood` text,
	`postal_code` text,
	`address` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_locations_org_city` ON `locations` (`organization_id`,`city`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memberships_org_user` ON `memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `monitors` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`filters_json` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`interval_hours` integer DEFAULT 24 NOT NULL,
	`next_run_at` text NOT NULL,
	`last_run_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_monitors_due` ON `monitors` (`enabled`,`next_run_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`credits` integer DEFAULT 250 NOT NULL,
	`settings_json` text NOT NULL,
	`initialized` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organizations_owner` ON `organizations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`website_id` text,
	`business_name` text NOT NULL,
	`price` real NOT NULL,
	`scope_json` text NOT NULL,
	`evidence_json` text NOT NULL,
	`delivery_days` integer NOT NULL,
	`agency_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_id`) REFERENCES `generated_websites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_org` ON `proposals` (`organization_id`);--> statement-breakpoint
CREATE TABLE `provider_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`provider` text NOT NULL,
	`operation` text NOT NULL,
	`units` integer NOT NULL,
	`estimated_cost` real,
	`duration_ms` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_usage_org_date` ON `provider_usage` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`business_name` text NOT NULL,
	`channel` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`engine` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scripts_org_date` ON `sales_scripts` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `search_results` (
	`id` text PRIMARY KEY NOT NULL,
	`search_id` text NOT NULL,
	`business_id` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`search_id`) REFERENCES `searches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_search_results_unique` ON `search_results` (`search_id`,`business_id`);--> statement-breakpoint
CREATE TABLE `searches` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`filters_json` text NOT NULL,
	`center_json` text NOT NULL,
	`provider` text NOT NULL,
	`result_count` integer NOT NULL,
	`cached` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_searches_org_date` ON `searches` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`provider_reference` text,
	`period_end` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscription_org` ON `subscriptions` (`organization_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `website_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business_id` text NOT NULL,
	`url` text NOT NULL,
	`mode` text NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audits_business` ON `website_analyses` (`organization_id`,`business_id`);--> statement-breakpoint
CREATE TABLE `website_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`website_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`change_note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_id`) REFERENCES `generated_websites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_versions_site` ON `website_versions` (`website_id`,`version`);