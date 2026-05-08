CREATE TABLE `beans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`roaster` text,
	`origin` text,
	`country_code` text,
	`process` text,
	`variety` text,
	`roast_level` integer,
	`roasted_on` integer,
	`altitude_masl` integer,
	`start_weight_g` real,
	`remaining_weight_g` real,
	`price_paid_minor` integer,
	`price_paid_currency` text,
	`flavor_tags` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `beans_live_name` ON `beans` (`deleted_at`,`name`);--> statement-breakpoint
CREATE TABLE `brew_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`t_seconds` real NOT NULL,
	`label` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `brew_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brew_milestones_session_t` ON `brew_milestones` (`session_id`,`t_seconds`);--> statement-breakpoint
CREATE TABLE `brew_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`bean_id` text NOT NULL,
	`method` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`dose_g` real NOT NULL,
	`yield_g` real,
	`duration_s` real,
	`pre_infusion_s` real,
	`first_drop_s` real,
	`grinder_label` text,
	`grind_setting` text,
	`water_temp_c` real,
	`rating` integer,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `brew_sessions_bean_started` ON `brew_sessions` (`bean_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `brew_sessions_live_started` ON `brew_sessions` (`deleted_at`,`started_at`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` integer PRIMARY KEY NOT NULL,
	`weight_unit` text DEFAULT 'g' NOT NULL,
	`default_ratio` real DEFAULT 2 NOT NULL,
	`theme_id` text DEFAULT 'earthy-forest' NOT NULL,
	`tds_assumed` real DEFAULT 0.09 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasting_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`mouthfeel` integer,
	`acidity` integer,
	`sweetness` integer,
	`bitterness` integer,
	`balance` integer,
	`flavor_tags` text,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `brew_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasting_notes_session_unique` ON `tasting_notes` (`session_id`);