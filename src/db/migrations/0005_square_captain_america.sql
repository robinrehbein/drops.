CREATE TABLE `place_user_data` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text NOT NULL,
	`wishlisted` integer DEFAULT false NOT NULL,
	`visited_at` integer,
	`rating` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `place_user_data_place` ON `place_user_data` (`place_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text DEFAULT 'seed' NOT NULL,
	`external_id` text,
	`name` text NOT NULL,
	`kind` text DEFAULT 'cafe' NOT NULL,
	`city` text,
	`country` text DEFAULT 'DE' NOT NULL,
	`address` text,
	`lat` real,
	`lng` real,
	`website` text,
	`opening_hours` text,
	`tags` text,
	`curated` integer DEFAULT false NOT NULL,
	`editorial_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `places_city_name` ON `places` (`city`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `places_external_id` ON `places` (`external_id`);--> statement-breakpoint
CREATE INDEX `places_curated` ON `places` (`curated`,`city`);--> statement-breakpoint
ALTER TABLE `beans` ADD `source_place_id` text;