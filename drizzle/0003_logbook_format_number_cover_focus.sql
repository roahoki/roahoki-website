ALTER TABLE "logbook_entries" ADD COLUMN "number" integer;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD COLUMN "cover_focus" text DEFAULT 'center' NOT NULL;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD CONSTRAINT "logbook_entries_format_check" CHECK (format IS NULL OR format = ANY (ARRAY['thought'::text, 'update'::text, 'one-liner'::text, 'project'::text, 'how-to'::text]));--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD CONSTRAINT "logbook_entries_cover_focus_check" CHECK (cover_focus = ANY (ARRAY['top'::text, 'center'::text, 'bottom'::text]));