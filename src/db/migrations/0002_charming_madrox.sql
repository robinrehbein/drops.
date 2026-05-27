ALTER TABLE `preferences` ADD `water_tank_capacity_ml` real DEFAULT 1800 NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `filter_change_threshold_ml` real DEFAULT 50000 NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `puck_absorption_ml_per_dose_g` real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `shot_flush_ml` real DEFAULT 20 NOT NULL;