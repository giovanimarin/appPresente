/*
  Warnings:

  - You are about to drop the column `mime_type` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `s3_key` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `size_bytes` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `attachments` table. All the data in the column will be lost.
  - Added the required column `content_type` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filename` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `school_id` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storage_key` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('EXAM', 'PARENT_MEETING', 'FIELD_TRIP', 'HOLIDAY', 'CULTURAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED');

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_communication_id_fkey";

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "mime_type",
DROP COLUMN "s3_key",
DROP COLUMN "size_bytes",
DROP COLUMN "type",
ADD COLUMN     "agenda_event_id" UUID,
ADD COLUMN     "content_type" VARCHAR(100) NOT NULL,
ADD COLUMN     "filename" VARCHAR(255) NOT NULL,
ADD COLUMN     "school_id" UUID NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "storage_key" TEXT NOT NULL,
ADD COLUMN     "uploaded_by" UUID,
ALTER COLUMN "communication_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "billing_email" VARCHAR(200),
ADD COLUMN     "max_students" INTEGER,
ADD COLUMN     "platform_note" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_by" VARCHAR(200);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "event_type" "EventType" NOT NULL,
    "subject" VARCHAR(100),
    "location" VARCHAR(200),
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" "RecurrenceType" NOT NULL DEFAULT 'NONE',
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_event_classes" (
    "event_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,

    CONSTRAINT "agenda_event_classes_pkey" PRIMARY KEY ("event_id","class_id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "protocol_number" VARCHAR(30),
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "internal_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "idx_event_school_date" ON "agenda_events"("school_id", "starts_at");

-- CreateIndex
CREATE INDEX "idx_form_school" ON "forms"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_protocol_number_key" ON "form_submissions"("protocol_number");

-- CreateIndex
CREATE INDEX "idx_submission_form" ON "form_submissions"("form_id", "status");

-- CreateIndex
CREATE INDEX "idx_submission_guardian" ON "form_submissions"("guardian_id");

-- CreateIndex
CREATE INDEX "idx_att_comm" ON "attachments"("communication_id");

-- CreateIndex
CREATE INDEX "idx_att_event" ON "attachments"("agenda_event_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_agenda_event_id_fkey" FOREIGN KEY ("agenda_event_id") REFERENCES "agenda_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event_classes" ADD CONSTRAINT "agenda_event_classes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "agenda_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_event_classes" ADD CONSTRAINT "agenda_event_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
