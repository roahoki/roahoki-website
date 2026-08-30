CREATE TABLE "exercise_counter_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise" text NOT NULL,
	"delta" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_counter_events_exercise_check" CHECK (exercise = ANY (ARRAY['pull_ups'::text, 'push_ups'::text, 'squats'::text, 'dips'::text, 'handstand_seconds'::text, 'pistol_squats'::text])),
	CONSTRAINT "exercise_counter_events_delta_check" CHECK (delta <> 0 AND abs(delta) <= 1000)
);
--> statement-breakpoint
ALTER TABLE "exercise_counter_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "exercise_counter_events_created_at_idx" ON "exercise_counter_events" USING btree ("created_at");--> statement-breakpoint
CREATE POLICY "service role full access to exercise counter events" ON "exercise_counter_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);