-- CreateEnum
CREATE TYPE "AppointmentSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "appointment_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "notes" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "scope" VARCHAR(20) NOT NULL DEFAULT 'ALL',
    "class_id" UUID,
    "student_id" UUID,
    "status" "AppointmentSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "notes" TEXT,
    "status" "AppointmentBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_slot_school_date" ON "appointment_slots"("school_id", "starts_at");

-- CreateIndex
CREATE INDEX "idx_slot_staff" ON "appointment_slots"("staff_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_bookings_slot_id_key" ON "appointment_bookings"("slot_id");

-- CreateIndex
CREATE INDEX "idx_booking_guardian" ON "appointment_bookings"("guardian_id");

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "appointment_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON UPDATE CASCADE;
