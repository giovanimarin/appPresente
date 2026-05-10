-- Add password_hash to guardians for optional email+password login
ALTER TABLE "guardians" ADD COLUMN "password_hash" TEXT;
