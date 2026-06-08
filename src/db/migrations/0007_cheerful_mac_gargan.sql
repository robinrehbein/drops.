DROP INDEX `recipes_bean_unique`;--> statement-breakpoint
ALTER TABLE `recipes` ADD `name` text;--> statement-breakpoint
CREATE INDEX `recipes_bean` ON `recipes` (`bean_id`,`deleted_at`);