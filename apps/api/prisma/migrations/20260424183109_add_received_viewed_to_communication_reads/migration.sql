-- AlterTable
ALTER TABLE "communication_reads" ADD COLUMN     "received_at" TIMESTAMP(3),
ADD COLUMN     "viewed_at" TIMESTAMP(3),
ALTER COLUMN "read_at" DROP NOT NULL;
