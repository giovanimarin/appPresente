-- Remove unique global de CPF de usuários, adiciona unique por escola
DROP INDEX IF EXISTS "users_cpf_key";
CREATE UNIQUE INDEX "users_cpf_school_id_key" ON "users"("cpf", "school_id") WHERE "cpf" IS NOT NULL;
