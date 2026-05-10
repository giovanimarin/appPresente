-- Add communicationId to agenda_events for auto-created events
ALTER TABLE "agenda_events" ADD COLUMN "communication_id" UUID;
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_communication_id_fkey"
  FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "idx_event_comm" ON "agenda_events"("communication_id");

-- Remove columns that are no longer used (manual-entry only fields)
ALTER TABLE "agenda_events" DROP COLUMN IF EXISTS "subject";
ALTER TABLE "agenda_events" DROP COLUMN IF EXISTS "location";
ALTER TABLE "agenda_events" DROP COLUMN IF EXISTS "ends_at";
ALTER TABLE "agenda_events" DROP COLUMN IF EXISTS "is_important";
ALTER TABLE "agenda_events" DROP COLUMN IF EXISTS "recurrence";

-- Set allDay default to true (all auto events are all-day)
ALTER TABLE "agenda_events" ALTER COLUMN "all_day" SET DEFAULT true;
