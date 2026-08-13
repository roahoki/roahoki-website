CREATE TABLE "logbook_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body_md" text NOT NULL,
	"cover_image_url" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logbook_entries_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'published'::text])),
	CONSTRAINT "logbook_entries_slug_not_empty" CHECK (length(slug) > 0)
);
--> statement-breakpoint
ALTER TABLE "logbook_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "logbook_entries_slug_key" ON "logbook_entries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "logbook_entries_tags_idx" ON "logbook_entries" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "logbook_entries_status_published_at_idx" ON "logbook_entries" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "public can read published logbook entries" ON "logbook_entries" AS PERMISSIVE FOR SELECT TO "anon" USING (status = 'published');--> statement-breakpoint
CREATE POLICY "service role full access to logbook entries" ON "logbook_entries" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);