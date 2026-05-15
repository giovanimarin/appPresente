-- CreateTable
CREATE TABLE "class_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "shift" VARCHAR(20) NOT NULL,
    "label" VARCHAR(100),

    CONSTRAINT "class_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_rooms_class_id_room_id_shift_key" ON "class_rooms"("class_id", "room_id", "shift");
CREATE INDEX "idx_class_rooms_class" ON "class_rooms"("class_id");

-- AddForeignKey
ALTER TABLE "class_rooms" ADD CONSTRAINT "class_rooms_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_rooms" ADD CONSTRAINT "class_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MigrateData: move existing room+shift from classes to class_rooms
INSERT INTO "class_rooms" ("class_id", "room_id", "shift")
SELECT "id", "room_id", COALESCE("shift", 'MORNING')
FROM "classes"
WHERE "room_id" IS NOT NULL;

-- AlterTable: remove old columns
ALTER TABLE "classes" DROP COLUMN IF EXISTS "room_id";
ALTER TABLE "classes" DROP COLUMN IF EXISTS "shift";
ALTER TABLE "classes" DROP COLUMN IF EXISTS "room";
