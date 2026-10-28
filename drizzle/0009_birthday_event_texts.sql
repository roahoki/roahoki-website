CREATE TABLE "birthday_event_texts" (
	"event_slug" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"details" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birthday_event_texts_event_slug_check" CHECK (event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])),
	CONSTRAINT "birthday_event_texts_details_array" CHECK (jsonb_typeof(details) = 'array')
);
--> statement-breakpoint
ALTER TABLE "birthday_event_texts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "service role full access to birthday event texts" ON "birthday_event_texts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);