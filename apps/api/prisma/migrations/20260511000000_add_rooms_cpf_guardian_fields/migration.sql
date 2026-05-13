-- Add CPF to users table
ALTER TABLE "users" ADD COLUMN "cpf" VARCHAR(11);

-- Add CPF to students table
ALTER TABLE "students" ADD COLUMN "cpf" VARCHAR(11);

-- Create rooms table
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_name_school_id_key" ON "rooms"("name", "school_id");
CREATE INDEX "idx_rooms_school" ON "rooms"("school_id");

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add roomId FK to classes
ALTER TABLE "classes" ADD COLUMN "room_id" UUID;

ALTER TABLE "classes" ADD CONSTRAINT "classes_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add guardian relationship fields to student_guardians
ALTER TABLE "student_guardians"
    ADD COLUMN "kinship_degree" VARCHAR(100),
    ADD COLUMN "is_legal_guardian" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "is_financial_guardian" BOOLEAN NOT NULL DEFAULT false;

-- Add audience_filter to communications
ALTER TABLE "communications" ADD COLUMN "audience_filter" VARCHAR(20) NOT NULL DEFAULT 'ALL';
