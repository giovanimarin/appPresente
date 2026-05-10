-- CreateTable
CREATE TABLE "guardian_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guardian_id" UUID NOT NULL,
    "communication_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_delivery_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "communication_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "target" VARCHAR(20) NOT NULL,
    "email_address" VARCHAR(200),
    "email_status" VARCHAR(20),
    "triggered_by" UUID,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notif_guardian" ON "guardian_notifications"("guardian_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_notifications_guardian_id_communication_id_key" ON "guardian_notifications"("guardian_id", "communication_id");

-- CreateIndex
CREATE INDEX "idx_delivery_log_comm" ON "communication_delivery_logs"("communication_id");

-- AddForeignKey
ALTER TABLE "guardian_notifications" ADD CONSTRAINT "guardian_notifications_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_notifications" ADD CONSTRAINT "guardian_notifications_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_delivery_logs" ADD CONSTRAINT "communication_delivery_logs_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_delivery_logs" ADD CONSTRAINT "communication_delivery_logs_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_delivery_logs" ADD CONSTRAINT "communication_delivery_logs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
