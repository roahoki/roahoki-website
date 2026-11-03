CREATE TABLE "birthday_whatsapp_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_slug" text NOT NULL,
	"name" text NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birthday_whatsapp_rsvps_event_slug_check" CHECK (event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])),
	CONSTRAINT "birthday_whatsapp_rsvps_name_length" CHECK (char_length(name) BETWEEN 1 AND 80),
	CONSTRAINT "birthday_whatsapp_rsvps_party_size_range" CHECK (party_size BETWEEN 1 AND 30)
);
--> statement-breakpoint
ALTER TABLE "birthday_whatsapp_rsvps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "birthday_whatsapp_rsvps_event_slug_idx" ON "birthday_whatsapp_rsvps" USING btree ("event_slug");--> statement-breakpoint
CREATE POLICY "service role full access to birthday whatsapp rsvps" ON "birthday_whatsapp_rsvps" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);