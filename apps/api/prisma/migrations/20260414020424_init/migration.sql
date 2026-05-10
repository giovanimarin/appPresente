-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SchoolCommType" AS ENUM ('NOTICE', 'URGENT', 'INFORMATIVE', 'DOCUMENT', 'PHOTO', 'EXAM', 'MEETING');

-- CreateEnum
CREATE TYPE "GuardianCommType" AS ENUM ('ABSENCE', 'MEDICAL_CERT', 'EARLY_DEPARTURE');

-- CreateEnum
CREATE TYPE "CommScope" AS ENUM ('CLASS', 'STUDENT');

-- CreateEnum
CREATE TYPE "SchoolCommStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuardianCommStatus" AS ENUM ('SENT', 'RECEIVED', 'UNDER_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING_INVITE', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "cnpj" VARCHAR(18),
    "logo_url" TEXT,
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "state" CHAR(2),
    "phone" VARCHAR(20),
    "email" VARCHAR(200),
    "plan" "PlanType" NOT NULL DEFAULT 'STARTER',
    "trial_ends_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "state" CHAR(2),
    "phone" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "unit_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coordinator_teachers" (
    "coordinator_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coordinator_teachers_pkey" PRIMARY KEY ("coordinator_id","teacher_id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "unit_id" UUID,
    "coordinator_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "grade" VARCHAR(50),
    "shift" VARCHAR(20),
    "year" INTEGER,
    "room" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_teachers" (
    "class_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "subject" VARCHAR(100),
    "is_homeroom" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("class_id","teacher_id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "enrollment_code" VARCHAR(50),
    "birth_date" DATE,
    "gender" VARCHAR(20),
    "notes" TEXT,
    "photo_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(200),
    "push_token" TEXT,
    "device_type" VARCHAR(10),
    "avatar_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardians" (
    "student_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "LinkStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "invited_by" UUID,
    "invited_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("student_id","guardian_id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "created_by" UUID,
    "guardian_id" UUID,
    "school_type" "SchoolCommType",
    "guardian_type" "GuardianCommType",
    "title" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "scope" "CommScope" NOT NULL,
    "school_status" "SchoolCommStatus",
    "guardian_status" "GuardianCommStatus",
    "requires_confirmation" BOOLEAN NOT NULL DEFAULT true,
    "protocol_number" VARCHAR(30),
    "internal_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "auto_reminder" BOOLEAN NOT NULL DEFAULT true,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_classes" (
    "communication_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,

    CONSTRAINT "communication_classes_pkey" PRIMARY KEY ("communication_id","class_id")
);

-- CreateTable
CREATE TABLE "communication_students" (
    "communication_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,

    CONSTRAINT "communication_students_pkey" PRIMARY KEY ("communication_id","student_id")
);

-- CreateTable
CREATE TABLE "communication_reads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "communication_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL,
    "device_type" VARCHAR(10),
    "ip_address" VARCHAR(45),

    CONSTRAINT "communication_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "communication_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "s3_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "mime_type" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_cnpj_key" ON "schools"("cnpj");

-- CreateIndex
CREATE INDEX "idx_users_school" ON "users"("school_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_school_id_key" ON "users"("email", "school_id");

-- CreateIndex
CREATE INDEX "idx_ct_teacher" ON "coordinator_teachers"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "coordinator_teachers_teacher_id_school_id_key" ON "coordinator_teachers"("teacher_id", "school_id");

-- CreateIndex
CREATE INDEX "idx_classes_school" ON "classes"("school_id", "active");

-- CreateIndex
CREATE INDEX "idx_classes_coordinator" ON "classes"("coordinator_id");

-- CreateIndex
CREATE INDEX "idx_clst_teacher" ON "class_teachers"("teacher_id");

-- CreateIndex
CREATE INDEX "idx_students_school" ON "students"("school_id", "active");

-- CreateIndex
CREATE INDEX "idx_students_class" ON "students"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_enrollment_code_school_id_key" ON "students"("enrollment_code", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_phone_key" ON "guardians"("phone");

-- CreateIndex
CREATE INDEX "idx_guardians_phone" ON "guardians"("phone");

-- CreateIndex
CREATE INDEX "idx_sg_guardian" ON "student_guardians"("guardian_id", "status");

-- CreateIndex
CREATE INDEX "idx_sg_student" ON "student_guardians"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "communications_protocol_number_key" ON "communications"("protocol_number");

-- CreateIndex
CREATE INDEX "idx_comm_school" ON "communications"("school_id", "school_status");

-- CreateIndex
CREATE INDEX "idx_comm_guardian_src" ON "communications"("guardian_id");

-- CreateIndex
CREATE INDEX "idx_comm_protocol" ON "communications"("protocol_number");

-- CreateIndex
CREATE INDEX "idx_comm_sent_at" ON "communications"("school_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "idx_reads_comm" ON "communication_reads"("communication_id");

-- CreateIndex
CREATE INDEX "idx_reads_guardian" ON "communication_reads"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_reads_communication_id_guardian_id_key" ON "communication_reads"("communication_id", "guardian_id");

-- AddForeignKey
ALTER TABLE "school_units" ADD CONSTRAINT "school_units_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "school_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinator_teachers" ADD CONSTRAINT "coordinator_teachers_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinator_teachers" ADD CONSTRAINT "coordinator_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "school_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_classes" ADD CONSTRAINT "communication_classes_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_classes" ADD CONSTRAINT "communication_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_students" ADD CONSTRAINT "communication_students_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_students" ADD CONSTRAINT "communication_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_reads" ADD CONSTRAINT "communication_reads_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_reads" ADD CONSTRAINT "communication_reads_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_reads" ADD CONSTRAINT "communication_reads_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
