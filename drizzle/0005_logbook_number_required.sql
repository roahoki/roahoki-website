ALTER TABLE "logbook_entries" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "logbook_entries_number_key" ON "logbook_entries" USING btree ("number");--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD CONSTRAINT "logbook_entries_number_positive" CHECK (number > 0);