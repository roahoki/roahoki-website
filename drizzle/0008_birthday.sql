CREATE TABLE "birthday_event_albums" (
	"event_slug" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birthday_event_albums_event_slug_check" CHECK (event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])),
	CONSTRAINT "birthday_event_albums_url_https" CHECK (url LIKE 'https://%')
);
--> statement-breakpoint
ALTER TABLE "birthday_event_albums" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "birthday_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"personal_message" text,
	"phone" text,
	"invited_events" text[] DEFAULT '{run,party,hike}'::text[] NOT NULL,
	"roki" jsonb,
	"scratched_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birthday_guests_name_not_empty" CHECK (length(trim(name)) > 0),
	CONSTRAINT "birthday_guests_token_format" CHECK (token ~ '^[0-9A-Za-z]{12}$'),
	CONSTRAINT "birthday_guests_invited_events_check" CHECK (invited_events <@ ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text] AND cardinality(invited_events) > 0)
);
--> statement-breakpoint
ALTER TABLE "birthday_guests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "birthday_rsvps" (
	"guest_id" uuid NOT NULL,
	"event_slug" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birthday_rsvps_guest_id_event_slug_pk" PRIMARY KEY("guest_id","event_slug"),
	CONSTRAINT "birthday_rsvps_event_slug_check" CHECK (event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])),
	CONSTRAINT "birthday_rsvps_status_check" CHECK (status = ANY (ARRAY['going'::text, 'not_going'::text]))
);
--> statement-breakpoint
ALTER TABLE "birthday_rsvps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "birthday_rsvps" ADD CONSTRAINT "birthday_rsvps_guest_id_birthday_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."birthday_guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "birthday_guests_token_key" ON "birthday_guests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "birthday_rsvps_event_slug_idx" ON "birthday_rsvps" USING btree ("event_slug");--> statement-breakpoint
CREATE POLICY "service role full access to birthday event albums" ON "birthday_event_albums" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service role full access to birthday guests" ON "birthday_guests" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service role full access to birthday rsvps" ON "birthday_rsvps" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);