ALTER TABLE "appointment_slots" ADD COLUMN "recurrence_group_id" UUID;

CREATE INDEX "idx_slot_recurrence_group" ON "appointment_slots"("recurrence_group_id") WHERE "recurrence_group_id" IS NOT NULL;
