import { prisma } from '../../config/database';

export type ImportRow = {
  studentName: string;
  className: string;
  grade?: string;
  enrollmentCode?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianCpf?: string;
  relationship?: string;
};

export type ImportResult = {
  created: { students: number; classes: number; guardians: number };
  skipped: number;
  errors: string[];
};

export class ImportService {
  async importRows(schoolId: string, rows: ImportRow[]): Promise<ImportResult> {
    const result: ImportResult = {
      created: { students: 0, classes: 0, guardians: 0 },
      skipped: 0,
      errors: [],
    };

    // Cache de turmas para não buscar repetidamente
    const classCache = new Map<string, string>(); // name+grade → id

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        if (!row.studentName?.trim()) {
          result.errors.push(`Linha ${rowNum}: nome do aluno ausente`);
          result.skipped++;
          continue;
        }

        // ── Turma ──────────────────────────────────────────────────────────
        const classKey = `${row.className?.trim()}|${row.grade?.trim() ?? ''}`;
        let classId = classCache.get(classKey);

        if (!classId && row.className?.trim()) {
          const existing = await prisma.class.findFirst({
            where: {
              schoolId,
              name: row.className.trim(),
              ...(row.grade ? { grade: row.grade.trim() } : {}),
            },
          });

          if (existing) {
            classId = existing.id;
          } else {
            const created = await prisma.class.create({
              data: {
                schoolId,
                name: row.className.trim(),
                grade: row.grade?.trim(),
                year: new Date().getFullYear(),
                active: true,
              },
            });
            classId = created.id;
            result.created.classes++;
          }

          classCache.set(classKey, classId);
        }

        if (!classId) {
          result.errors.push(`Linha ${rowNum}: turma inválida para aluno "${row.studentName}"`);
          result.skipped++;
          continue;
        }

        // ── Aluno ──────────────────────────────────────────────────────────
        let student = row.enrollmentCode?.trim()
          ? await prisma.student.findFirst({
              where: { enrollmentCode: row.enrollmentCode.trim(), schoolId },
            })
          : null;

        if (!student) {
          // Tenta encontrar por nome + turma
          student = await prisma.student.findFirst({
            where: { name: row.studentName.trim(), classId, schoolId },
          });
        }

        if (!student) {
          student = await prisma.student.create({
            data: {
              schoolId,
              classId,
              name: row.studentName.trim(),
              enrollmentCode: row.enrollmentCode?.trim() || undefined,
              active: true,
            },
          });
          result.created.students++;
        } else {
          // Atualiza dados existentes
          await prisma.student.update({
            where: { id: student.id },
            data: {
              name: row.studentName.trim(),
              classId,
              enrollmentCode: row.enrollmentCode?.trim() || undefined,
              active: true,
            },
          });
        }

        // ── Responsável ────────────────────────────────────────────────────
        if (row.guardianEmail?.trim() || row.guardianPhone?.trim() || row.guardianCpf?.trim()) {
          const guardianEmail = row.guardianEmail?.trim().toLowerCase() || undefined;
          const guardianPhone = row.guardianPhone?.trim() || undefined;
          const guardianCpf = row.guardianCpf?.replace(/\D/g, '') || undefined;

          // Lookup order: CPF → phone → email
          let guardian = guardianCpf
            ? await prisma.guardian.findFirst({ where: { cpf: guardianCpf } })
            : null;

          if (!guardian && guardianPhone) {
            guardian = await prisma.guardian.findFirst({ where: { phone: guardianPhone } });
          }

          if (!guardian && guardianEmail) {
            guardian = await prisma.guardian.findFirst({ where: { email: guardianEmail } });
          }

          if (!guardian) {
            guardian = await prisma.guardian.create({
              data: {
                schoolId,
                name: row.guardianName?.trim() || 'Responsável',
                email: guardianEmail,
                phone: guardianPhone || `T${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 20),
                cpf: guardianCpf || undefined,
                active: true,
              },
            });
            result.created.guardians++;
          } else {
            const updates: Record<string, unknown> = { active: true };
            if (row.guardianName?.trim()) updates.name = row.guardianName.trim();
            if (guardianCpf && !guardian.cpf) updates.cpf = guardianCpf;
            await prisma.guardian.update({ where: { id: guardian.id }, data: updates });
          }

          // Vínculo aluno ↔ responsável
          const existingLink = await prisma.studentGuardian.findFirst({
            where: { studentId: student.id, guardianId: guardian.id },
          });

          if (!existingLink) {
            const rel = row.relationship?.trim() || 'responsavel';
            await prisma.studentGuardian.create({
              data: {
                studentId: student.id,
                guardianId: guardian.id,
                schoolId,
                relationship: rel,
                isPrimary: ['mae', 'pai', 'mãe'].includes(rel.toLowerCase()),
                status: 'PENDING_INVITE',
              },
            });
          }
        }
      } catch (err) {
        const e = err as { message?: string };
        result.errors.push(`Linha ${rowNum}: ${e.message ?? 'erro desconhecido'}`);
        result.skipped++;
      }
    }

    return result;
  }
}
