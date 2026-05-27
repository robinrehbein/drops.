CREATE TABLE `water_events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`session_id` text,
	`volume_ml` real DEFAULT 0 NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `brew_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `water_events_created` ON `water_events` (`deleted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `water_events_session` ON `water_events` (`session_id`);