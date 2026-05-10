-- Add CPF field to guardians (optional, unique, stored as 11 digits)
ALTER TABLE "guardians" ADD COLUMN "cpf" VARCHAR(11);
CREATE UNIQUE INDEX "guardians_cpf_key" ON "guardians"("cpf") WHERE "cpf" IS NOT NULL;
CREATE INDEX "idx_guardians_cpf" ON "guardians"("cpf");
