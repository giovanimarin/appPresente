-- CreateTable
CREATE TABLE "guardian_school_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guardian_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    "nickname" VARCHAR(100),

    CONSTRAINT "guardian_school_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_school_preferences_guardian_id_school_id_key" ON "guardian_school_preferences"("guardian_id", "school_id");

-- AddForeignKey
ALTER TABLE "guardian_school_preferences" ADD CONSTRAINT "guardian_school_preferences_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_school_preferences" ADD CONSTRAINT "guardian_school_preferences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
