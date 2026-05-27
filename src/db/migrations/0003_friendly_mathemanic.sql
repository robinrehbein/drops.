CREATE TABLE `machines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`model` text,
	`vendor` text,
	`acquired_on` integer,
	`notes` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `machines_primary_live` ON `machines` (`deleted_at`,`is_primary`);--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`done_at` integer NOT NULL,
	`shots_at_time` integer,
	`liters_at_time` real,
	`notes` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `maintenance_logs_task_done` ON `maintenance_logs` (`task_id`,`done_at`);--> statement-breakpoint
CREATE TABLE `maintenance_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`machine_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`cadence_kind` text NOT NULL,
	`cadence_value` real NOT NULL,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `maintenance_tasks_machine_active` ON `maintenance_tasks` (`machine_id`,`active`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`bean_id` text NOT NULL,
	`source_session_id` text,
	`dose_g` real,
	`target_yield_g` real,
	`duration_target_s` real,
	`grinder_label` text,
	`grind_setting` text,
	`water_temp_c` real,
	`ratio_target` real,
	`notes` text,
	`saved_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_session_id`) REFERENCES `brew_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_bean_unique` ON `recipes` (`bean_id`);--> statement-breakpoint
ALTER TABLE `beans` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `beans` ADD `would_buy_again` integer;--> statement-breakpoint
ALTER TABLE `beans` ADD `finished_at` integer;--> statement-breakpoint
ALTER TABLE `beans` ADD `recipe_id` text;--> statement-breakpoint
CREATE INDEX `beans_status_live` ON `beans` (`deleted_at`,`status`,`name`);--> statement-breakpoint
ALTER TABLE `brew_sessions` ADD `machine_id` text;--> statement-breakpoint
ALTER TABLE `preferences` ADD `daily_cups_goal` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `caffeine_target_mg` integer;