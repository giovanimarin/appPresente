-- Passo 1: Remove unique global de CPF, adiciona unique por escola
DROP INDEX IF EXISTS "guardians_cpf_key";
CREATE UNIQUE INDEX "guardians_cpf_school_id_key" ON "guardians"("cpf", "school_id") WHERE "cpf" IS NOT NULL;

-- Passo 2: Corrige vínculos existentes onde guardian.school_id != student.school_id
-- Para cada vínculo incorreto: cria guardian na escola certa e redireciona o link
DO $$
DECLARE
  rec RECORD;
  new_gid UUID;
BEGIN
  FOR rec IN
    SELECT
      sg.student_id,
      sg.guardian_id         AS old_gid,
      s.school_id            AS target_school_id,
      g.name, g.phone, g.email, g.cpf, g.active, g.activated_at,
      g.push_token, g.device_type, g.avatar_url,
      sg.relationship, sg.kinship_degree,
      sg.is_legal_guardian, sg.is_financial_guardian, sg.is_primary,
      sg.status, sg.activated_at AS link_activated_at,
      sg.invited_by, sg.invited_at, sg.school_id AS sg_school_id
    FROM student_guardians sg
    JOIN students  s ON s.id = sg.student_id
    JOIN guardians g ON g.id = sg.guardian_id
    WHERE g.school_id != s.school_id
  LOOP
    -- Busca guardian já existente na escola correta com mesmo CPF / telefone / email
    SELECT id INTO new_gid
    FROM guardians
    WHERE school_id = rec.target_school_id
      AND (
        (rec.cpf   IS NOT NULL AND cpf   = rec.cpf)
        OR (rec.phone IS NOT NULL AND phone = rec.phone)
        OR (rec.email IS NOT NULL AND email = rec.email)
      )
    LIMIT 1;

    -- Se não encontrou, cria um novo registro na escola correta
    IF new_gid IS NULL THEN
      INSERT INTO guardians (
        id, school_id, name, phone, email, cpf,
        active, activated_at, push_token, device_type, avatar_url,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), rec.target_school_id, rec.name, rec.phone, rec.email, rec.cpf,
        rec.active, rec.activated_at, rec.push_token, rec.device_type, rec.avatar_url,
        NOW(), NOW()
      )
      RETURNING id INTO new_gid;
    END IF;

    -- Redireciona o link se não houver conflito de unique
    IF NOT EXISTS (
      SELECT 1 FROM student_guardians
      WHERE student_id = rec.student_id AND guardian_id = new_gid
    ) THEN
      UPDATE student_guardians
      SET guardian_id = new_gid
      WHERE student_id = rec.student_id AND guardian_id = rec.old_gid;
    ELSE
      -- Já existe link para o guardian correto; remove o duplicado incorreto
      DELETE FROM student_guardians
      WHERE student_id = rec.student_id AND guardian_id = rec.old_gid;
    END IF;
  END LOOP;
END $$;
