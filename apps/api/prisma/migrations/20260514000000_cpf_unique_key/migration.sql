-- CPF como chave única global de usuários
-- 1. User.cpf: adiciona unique (NULL não conta, então usuários sem CPF não conflitam)
CREATE UNIQUE INDEX IF NOT EXISTS "users_cpf_key" ON "users"("cpf") WHERE "cpf" IS NOT NULL;

-- 2. Guardian.phone: remove unique e torna nullable (CPF passa a ser o identificador único)
DROP INDEX IF EXISTS "guardians_phone_key";
ALTER TABLE "guardians" ALTER COLUMN "phone" DROP NOT NULL;
