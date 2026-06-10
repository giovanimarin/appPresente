import { randomBytes } from 'crypto';
import { prisma } from '../../config/database';
import { redis, redisKeys } from '../../config/redis';
import { sendGuardianWelcomeEmail, sendGuardianLinkedToSchoolEmail } from '../../utils/mailer';
import { sendPushToToken } from '../../utils/push';
import type { CreateClassDto, UpdateClassDto, ClassRoomDto, CreateStudentDto, UpdateStudentDto } from './classes.schemas';

const CLASS_SELECT = {
  id: true, name: true, grade: true, year: true, shift: true, active: true,
  coordinator: { select: { id: true, name: true } },
  classRooms: { select: { id: true, shift: true, label: true, room: { select: { id: true, name: true } } } },
  classTeachers: { select: { teacher: { select: { id: true, name: true } }, subject: true, isHomeroom: true } },
  _count: { select: { students: { where: { active: true } } } },
} as const;

const STUDENT_SELECT = {
  id: true, name: true, enrollmentCode: true, birthDate: true, gender: true, notes: true, cpf: true, active: true,
  class: { select: { id: true, name: true, grade: true } },
  _count: { select: { studentGuardians: { where: { status: { in: ['ACTIVE', 'PENDING_INVITE'] } } } } },
} as const;

export class ClassesService {
  // ── Turmas ────────────────────────────────────────────────────────────────

  async listClasses(schoolId: string, userId: string, role: string, query: { search?: string; grade?: string; shift?: string; includeInactive?: boolean } = {}) {
    const where: Record<string, unknown> = { schoolId };
    if (!query.includeInactive) where.active = true;
    if (role === 'TEACHER') where.classTeachers = { some: { teacherId: userId } };
    if (role === 'COORDINATOR') where.coordinatorId = userId;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    if (query.grade) where.grade = query.grade;
    if (query.shift) where.shift = query.shift;

    const [data, total] = await Promise.all([
      prisma.class.findMany({ where, select: CLASS_SELECT as never, orderBy: { name: 'asc' } }),
      prisma.class.count({ where }),
    ]);
    return { data, total };
  }

  async getClass(schoolId: string, classId: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: CLASS_SELECT as never });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    return cls;
  }

  private async _checkRoomConflict(schoolId: string, roomId: string, shift: string, excludeClassId?: string) {
    const SHIFT_LABELS: Record<string, string> = {
      MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
    };
    const conflictingShifts = shift === 'INTEGRAL'
      ? ['INTEGRAL', 'MATUTINO', 'VESPERTINO', 'NOTURNO']
      : [shift, 'INTEGRAL'];

    const conflict = await prisma.classRoom.findFirst({
      where: {
        roomId,
        shift: { in: conflictingShifts },
        class: { schoolId, active: true, ...(excludeClassId ? { id: { not: excludeClassId } } : {}) },
      },
      include: { class: { select: { name: true } } },
    });
    if (conflict) {
      const label = SHIFT_LABELS[conflict.shift] ?? conflict.shift;
      throw { status: 409, code: 'ROOM_SHIFT_CONFLICT', message: `Esta sala já está ocupada no turno ${label} pela turma "${conflict.class.name}"` };
    }
  }

  async createClass(schoolId: string, dto: CreateClassDto) {
    const duplicate = await prisma.class.findFirst({
      where: { schoolId, name: { equals: dto.name, mode: 'insensitive' }, grade: dto.grade ?? null, year: dto.year ?? null, shift: dto.shift ?? null },
    });
    if (duplicate) {
      throw { status: 409, code: 'CLASS_DUPLICATE', message: 'Já existe uma turma com este Nome, Série, Ano letivo e Turno' };
    }

    if (dto.classRooms?.length) {
      for (const cr of dto.classRooms) {
        await this._checkRoomConflict(schoolId, cr.roomId, cr.shift);
      }
    }

    return prisma.class.create({
      data: {
        schoolId, name: dto.name, grade: dto.grade, year: dto.year, shift: dto.shift,
        coordinatorId: dto.coordinatorId, unitId: dto.unitId, active: true,
        classRooms: dto.classRooms?.length
          ? { create: dto.classRooms.map((cr) => ({ roomId: cr.roomId, shift: cr.shift, label: cr.label })) }
          : undefined,
      },
      select: CLASS_SELECT as never,
    });
  }

  async updateClass(schoolId: string, classId: string, dto: UpdateClassDto) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    const { classRooms: _, ...data } = dto;
    return prisma.class.update({ where: { id: classId }, data: { ...data, shift: dto.shift ?? cls.shift }, select: CLASS_SELECT as never });
  }

  async addClassRoom(schoolId: string, classId: string, dto: ClassRoomDto) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };

    const SHIFT_LABELS: Record<string, string> = {
      MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
    };

    // Valida compatibilidade de turno com o turno da turma
    if (cls.shift) {
      if (cls.shift === 'INTEGRAL') {
        if (!['MATUTINO', 'VESPERTINO'].includes(dto.shift)) {
          throw { status: 400, code: 'SHIFT_MISMATCH', message: 'Turmas integrais só aceitam salas nos turnos Matutino ou Vespertino' };
        }
      } else if (dto.shift !== cls.shift) {
        const label = SHIFT_LABELS[cls.shift] ?? cls.shift;
        throw { status: 400, code: 'SHIFT_MISMATCH', message: `Esta turma é ${label}. Só é possível associar salas no turno ${label}` };
      }
    }

    // Valida: a turma já possui uma sala neste turno
    const existingInShift = await prisma.classRoom.findFirst({ where: { classId, shift: dto.shift } });
    if (existingInShift) {
      const label = SHIFT_LABELS[dto.shift] ?? dto.shift;
      throw { status: 409, code: 'SHIFT_ALREADY_HAS_ROOM', message: `Esta turma já possui uma sala no turno ${label}` };
    }

    await this._checkRoomConflict(schoolId, dto.roomId, dto.shift, classId);
    return prisma.classRoom.create({
      data: { classId, roomId: dto.roomId, shift: dto.shift, label: dto.label },
      include: { room: { select: { id: true, name: true } } },
    });
  }

  async removeClassRoom(schoolId: string, classId: string, roomId: string, shift: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    await prisma.classRoom.deleteMany({ where: { classId, roomId, shift } });
    return { success: true };
  }

  async setClassActive(schoolId: string, classId: string, active: boolean) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    return prisma.class.update({ where: { id: classId }, data: { active }, select: { id: true, active: true } });
  }

  async deleteClassPermanent(schoolId: string, classId: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };

    const studentCount = await prisma.student.count({ where: { classId } });
    if (studentCount > 0) {
      throw { status: 400, code: 'CLASS_HAS_STUDENTS', message: `Esta turma possui ${studentCount} aluno(s). Transfira ou exclua os alunos antes.` };
    }

    const teacherCount = await prisma.classTeacher.count({ where: { classId } });
    if (teacherCount > 0) {
      throw { status: 400, code: 'CLASS_HAS_TEACHERS', message: `Esta turma possui ${teacherCount} professor(es) vinculado(s). Remova-os antes de excluir.` };
    }

    await prisma.class.delete({ where: { id: classId } });
    return { success: true };
  }

  async getClassStudents(schoolId: string, classId: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    return prisma.student.findMany({
      where: { classId, schoolId, active: true },
      include: {
        studentGuardians: {
          include: { guardian: { select: { id: true, name: true, phone: true, activatedAt: true, pushToken: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── Alunos ────────────────────────────────────────────────────────────────

  async listStudents(schoolId: string, userId: string, role: string, query: { search?: string; classId?: string; includeInactive?: boolean } = {}) {
    const where: Record<string, unknown> = { schoolId };
    if (!query.includeInactive) where.active = true;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    if (query.classId) {
      where.classId = query.classId;
    } else if (role === 'TEACHER') {
      const teacherClasses = await prisma.classTeacher.findMany({ where: { teacherId: userId }, select: { classId: true } });
      where.classId = { in: teacherClasses.map((c) => c.classId) };
    }

    const [data, total] = await Promise.all([
      prisma.student.findMany({ where, select: STUDENT_SELECT as never, orderBy: { name: 'asc' } }),
      prisma.student.count({ where }),
    ]);
    return { data, total };
  }

  async getStudent(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: STUDENT_SELECT as never });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };
    return student;
  }

  async createStudent(schoolId: string, dto: CreateStudentDto) {
    if (dto.classId) {
      const cls = await prisma.class.findFirst({ where: { id: dto.classId, schoolId } });
      if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    }
    if (dto.enrollmentCode) {
      const existing = await prisma.student.findFirst({ where: { enrollmentCode: dto.enrollmentCode, schoolId } });
      if (existing) throw { status: 409, code: 'ENROLLMENT_EXISTS', message: 'Matrícula já cadastrada nesta escola' };
    }
    return prisma.student.create({
      data: { schoolId, classId: dto.classId, name: dto.name, enrollmentCode: dto.enrollmentCode, birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined, gender: dto.gender, notes: dto.notes, cpf: dto.cpf, active: true },
    });
  }

  async updateStudent(schoolId: string, studentId: string, dto: UpdateStudentDto) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };
    if (dto.classId) {
      const cls = await prisma.class.findFirst({ where: { id: dto.classId, schoolId } });
      if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    return prisma.student.update({ where: { id: studentId }, data, select: STUDENT_SELECT as never });
  }

  async setStudentActive(schoolId: string, studentId: string, active: boolean) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };
    return prisma.student.update({ where: { id: studentId }, data: { active }, select: { id: true, active: true } });
  }

  async deleteStudentPermanent(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };

    const guardianCount = await prisma.studentGuardian.count({ where: { studentId } });
    if (guardianCount > 0) {
      throw {
        status: 400,
        code: 'STUDENT_HAS_GUARDIANS',
        message: `Este aluno está vinculado a ${guardianCount} responsável(is). Desvincule antes de excluir.`,
      };
    }

    await prisma.communicationStudent.deleteMany({ where: { studentId } });
    await prisma.communicationRead.deleteMany({ where: { studentId } });
    await prisma.formSubmission.deleteMany({ where: { studentId } });
    await prisma.student.delete({ where: { id: studentId } });
    return { success: true };
  }

  // ── Professores da turma ──────────────────────────────────────────────────

  async addClassTeacher(schoolId: string, classId: string, teacherId: string, subject?: string, isHomeroom?: boolean) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    const teacher = await prisma.user.findFirst({ where: { id: teacherId, schoolId, role: 'TEACHER', active: true } });
    if (!teacher) throw { status: 404, code: 'TEACHER_NOT_FOUND', message: 'Professor não encontrado' };

    if (isHomeroom && cls.shift) {
      const conflictingShifts = cls.shift === 'INTEGRAL'
        ? ['INTEGRAL', 'MATUTINO', 'VESPERTINO', 'NOTURNO']
        : [cls.shift, 'INTEGRAL'];
      const conflict = await prisma.classTeacher.findFirst({
        where: {
          teacherId,
          isHomeroom: true,
          classId: { not: classId },
          class: { schoolId, active: true, shift: { in: conflictingShifts } },
        },
        include: { class: { select: { name: true, shift: true } } },
      });
      if (conflict) {
        const SHIFT_LABELS: Record<string, string> = {
          MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
        };
        const shiftLabel = SHIFT_LABELS[conflict.class.shift ?? ''] ?? conflict.class.shift;
        throw {
          status: 409,
          code: 'TEACHER_HOMEROOM_CONFLICT',
          message: `${teacher.name} já é professor(a) titular da turma "${conflict.class.name}" (${shiftLabel}). Um professor não pode ser titular em duas turmas no mesmo turno.`,
        };
      }
    }

    return prisma.classTeacher.upsert({
      where: { classId_teacherId: { classId, teacherId } },
      create: { classId, teacherId, schoolId, subject, isHomeroom: isHomeroom ?? false },
      update: { subject, isHomeroom: isHomeroom ?? false },
    });
  }

  async removeClassTeacher(schoolId: string, classId: string, teacherId: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };
    await prisma.classTeacher.deleteMany({ where: { classId, teacherId } });
    return { success: true };
  }

  async getStudentGuardians(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };
    return prisma.studentGuardian.findMany({
      where: { studentId },
      select: {
        relationship: true, status: true, isPrimary: true,
        kinshipDegree: true, isLegalGuardian: true, isFinancialGuardian: true,
        guardian: { select: { id: true, name: true, phone: true, email: true, activatedAt: true, pushToken: true, deviceType: true } },
      },
    });
  }

  async linkGuardianToStudent(schoolId: string, studentId: string, dto: { phone?: string; cpf?: string; guardianId?: string; name?: string; email?: string; relationship?: string; kinshipDegree?: string; isLegalGuardian?: boolean; isFinancialGuardian?: boolean }) {
    if (!dto.phone && !dto.guardianId) throw { status: 400, code: 'PHONE_OR_GUARDIAN_REQUIRED', message: 'Informe o telefone ou o responsável' };

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };

    const count = await prisma.studentGuardian.count({
      where: { studentId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
    });
    if (count >= 5) throw { status: 400, code: 'MAX_GUARDIANS_REACHED', message: 'Máximo de 5 responsáveis por aluno' };

    let guardian;
    let existingElsewhere: { activatedAt: Date | null; pushToken: string | null; name: string; email: string | null; cpf: string | null } | null = null;

    if (dto.guardianId) {
      guardian = await prisma.guardian.findFirst({ where: { id: dto.guardianId, schoolId } });
      if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
    } else {
      const cpf = dto.cpf?.replace(/\D/g, '') || undefined;

      // Busca primeiro dentro da própria escola
      if (cpf) {
        guardian = await prisma.guardian.findFirst({ where: { cpf, schoolId } });
      }
      if (!guardian && dto.phone) {
        guardian = await prisma.guardian.findFirst({ where: { phone: dto.phone, schoolId } });
      }

      if (!guardian) {
        // Verifica se existe em outra escola para herdar activatedAt
        if (cpf) existingElsewhere = await prisma.guardian.findFirst({ where: { cpf, schoolId: { not: schoolId } }, select: { activatedAt: true, pushToken: true, name: true, email: true, cpf: true } });
        if (!existingElsewhere && dto.phone) existingElsewhere = await prisma.guardian.findFirst({ where: { phone: dto.phone, schoolId: { not: schoolId } }, select: { activatedAt: true, pushToken: true, name: true, email: true, cpf: true } });

        if (!dto.phone) throw { status: 400, code: 'PHONE_REQUIRED', message: 'Telefone é obrigatório para criar responsável' };
        guardian = await prisma.guardian.create({
          data: {
            phone: dto.phone,
            name: dto.name?.trim() || existingElsewhere?.name || '',
            email: dto.email?.trim().toLowerCase() || existingElsewhere?.email || undefined,
            cpf: cpf || existingElsewhere?.cpf || undefined,
            schoolId,
            active: true,
            ...(existingElsewhere?.activatedAt ? { activatedAt: existingElsewhere.activatedAt } : {}),
          },
        });
      } else {
        const updates: Record<string, unknown> = {};
        if (dto.name?.trim() && !guardian.name) updates.name = dto.name.trim();
        if (dto.email?.trim() && !guardian.email) updates.email = dto.email.trim().toLowerCase();
        if (cpf && !guardian.cpf) updates.cpf = cpf;
        if (Object.keys(updates).length > 0) {
          guardian = await prisma.guardian.update({ where: { id: guardian.id }, data: updates });
        }
      }
    }

    const rel = dto.relationship?.trim() || 'responsavel';
    // Staff linking by guardianId = direct authorization → ACTIVE immediately
    // Linking by phone/CPF (invite flow) = PENDING_INVITE until guardian accepts
    const linkStatus = dto.guardianId ? 'ACTIVE' : 'PENDING_INVITE';
    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId, guardianId: guardian.id } },
      update: {
        status: linkStatus,
        relationship: rel,
        kinshipDegree: dto.kinshipDegree ?? null,
        isLegalGuardian: dto.isLegalGuardian ?? false,
        isFinancialGuardian: dto.isFinancialGuardian ?? false,
        ...(linkStatus === 'ACTIVE' ? { activatedAt: new Date() } : {}),
      },
      create: {
        studentId, guardianId: guardian.id, schoolId,
        relationship: rel,
        kinshipDegree: dto.kinshipDegree ?? null,
        isLegalGuardian: dto.isLegalGuardian ?? false,
        isFinancialGuardian: dto.isFinancialGuardian ?? false,
        isPrimary: ['mae', 'mãe', 'pai'].includes(rel.toLowerCase()),
        status: linkStatus,
        ...(linkStatus === 'ACTIVE' ? { activatedAt: new Date() } : {}),
      },
    });

    // Notifica o responsável sobre o vínculo
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    const schoolName = school?.name ?? 'Escola';

    if (guardian.activatedAt) {
      // Responsável já ativo (nova escola) → e-mail informativo + push
      const emailTo = guardian.email ?? existingElsewhere?.email ?? null;
      if (emailTo) {
        await sendGuardianLinkedToSchoolEmail(emailTo, guardian.name, schoolName);
      }
      const pushToken = existingElsewhere?.pushToken ?? guardian.pushToken;
      if (pushToken) {
        await sendPushToToken(pushToken, 'Nova escola no Presente', `Você foi vinculado à escola ${schoolName}`, { type: 'NEW_SCHOOL' });
      }
    } else if (guardian.email) {
      // Responsável ainda não ativou → envia/reenvia e-mail de primeiro acesso
      const token = randomBytes(32).toString('hex');
      const webUrl = process.env.WEB_URL ?? 'https://app.apppresente.com.br';
      await redis.set(redisKeys.guardianFirstAccess(token), guardian.id, 'EX', 60 * 60 * 72);
      const firstAccessUrl = `${webUrl}/guardian/primeiro-acesso?token=${token}`;
      await sendGuardianWelcomeEmail(guardian.email, guardian.name, schoolName, firstAccessUrl);
    }

    return guardian;
  }

  async removeStudentFromClass(schoolId: string, classId: string, studentId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId, classId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado nesta turma' };
    await prisma.student.update({ where: { id: studentId }, data: { classId: null } });
    return { success: true };
  }

  async unlinkGuardianFromStudent(schoolId: string, studentId: string, guardianId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };
    await prisma.studentGuardian.deleteMany({ where: { studentId, guardianId } });
    return { success: true };
  }
}
