CREATE TABLE "birthday_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_slug" text NOT NULL,
	"guest_id" uuid,
	"question" text NOT NULL,
	"answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "birthday_questions_event_slug_check" CHECK (event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])),
	CONSTRAINT "birthday_questions_question_length" CHECK (char_length(question) BETWEEN 1 AND 300),
	CONSTRAINT "birthday_questions_faq_answered" CHECK (guest_id IS NOT NULL OR answer IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "birthday_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "birthday_questions" ADD CONSTRAINT "birthday_questions_guest_id_birthday_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."birthday_guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "birthday_questions_event_slug_idx" ON "birthday_questions" USING btree ("event_slug");--> statement-breakpoint
CREATE POLICY "service role full access to birthday questions" ON "birthday_questions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);