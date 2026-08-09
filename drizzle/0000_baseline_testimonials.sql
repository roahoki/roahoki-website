CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"image_url" text,
	"linkedin_url" text,
	"github_username" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "testimonials_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "public can read approved" ON "testimonials" AS PERMISSIVE FOR SELECT TO "anon" USING (status = 'approved');--> statement-breakpoint
CREATE POLICY "public can insert" ON "testimonials" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service role full access" ON "testimonials" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);