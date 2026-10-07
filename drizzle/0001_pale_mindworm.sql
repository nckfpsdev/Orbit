CREATE TABLE `api_operations` (
	`organization_id` text NOT NULL,
	`operation_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`response_json` text,
	`http_status` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_operations_org_key` ON `api_operations` (`organization_id`,`operation_key`);--> statement-breakpoint
CREATE INDEX `idx_operations_date` ON `api_operations` (`created_at`);