ALTER TABLE "logbook_entries" ADD COLUMN "cover_crop_x" real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD COLUMN "cover_crop_y" real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD COLUMN "cover_zoom" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD CONSTRAINT "logbook_entries_cover_crop_check" CHECK (cover_crop_x BETWEEN 0 AND 1 AND cover_crop_y BETWEEN 0 AND 1 AND cover_zoom BETWEEN 1 AND 4);