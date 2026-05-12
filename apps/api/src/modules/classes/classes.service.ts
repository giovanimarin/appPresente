import { prisma } from '../../config/database';
import type { CreateClassDto, UpdateClassDto, CreateStudentDto, UpdateStudentDto } from './classes.schemas';

const CLASS_SELECT = {
  id: true, name: true, grade: true, shift: true, year: true, room: true, roomId: true, active: true,
  coordinator: { select: { id: true, name: true } },
  roomRel: { select: { id: true, name: true } },
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
    const conflict = await prisma.class.findFirst({
      where: {
        schoolId,
        roomId,
        shift,
        active: true,
        ...(excludeClassId ? { id: { not: excludeClassId } } : {}),
      },
      select: { id: true, name: true },
    });
    if (conflict) {
      throw { status: 409, code: 'ROOM_SHIFT_CONFLICT', message: `Esta sala já está ocupada por outra turma no mesmo turno (${conflict.name})` };
    }
  }

  async createClass(schoolId: string, dto: CreateClassDto) {
    // Impede turmas idênticas (mesmo nome + série + turno + ano letivo)
    if (dto.name && dto.shift && dto.year) {
      const duplicate = await prisma.class.findFirst({
        where: {
          schoolId,
          name: { equals: dto.name, mode: 'insensitive' },
          grade: dto.grade ? { equals: dto.grade, mode: 'insensitive' } : null,
          shift: dto.shift,
          year: dto.year,
        },
      });
      if (duplicate) {
        throw { status: 409, code: 'CLASS_DUPLICATE', message: 'Já existe uma turma com este Nome, Série, Turno e Ano letivo' };
      }
    }

    // Impede conflito de sala: mesma sala + mesmo turno
    if (dto.roomId && dto.shift) {
      await this._checkRoomConflict(schoolId, dto.roomId, dto.shift);
    }

    return prisma.class.create({
      data: { schoolId, name: dto.name, grade: dto.grade, shift: dto.shift, year: dto.year, room: dto.room, roomId: dto.roomId, coordinatorId: dto.coordinatorId, unitId: dto.unitId, active: true },
    });
  }

  async updateClass(schoolId: string, classId: string, dto: UpdateClassDto) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw { status: 404, code: 'CLASS_NOT_FOUND', message: 'Turma não encontrada' };

    // Conflito de sala: usa roomId e shift resolvidos (dto pode vir parcial)
    const effectiveRoomId = dto.roomId !== undefined ? dto.roomId : cls.roomId;
    const effectiveShift = dto.shift !== undefined ? dto.shift : cls.shift;
    if (effectiveRoomId && effectiveShift) {
      await this._checkRoomConflict(schoolId, effectiveRoomId, effectiveShift, classId);
    }

    return prisma.class.update({ where: { id: classId }, data: dto });
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

    if (dto.guardianId) {
      guardian = await prisma.guardian.findFirst({ where: { id: dto.guardianId, schoolId } });
      if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
    } else {
      const cpf = dto.cpf?.replace(/\D/g, '') || undefined;

      // Look up by CPF first, then phone
      if (cpf) {
        guardian = await prisma.guardian.findFirst({ where: { cpf } });
      }
      if (!guardian && dto.phone) {
        guardian = await prisma.guardian.findFirst({ where: { phone: dto.phone } });
      }

      if (!guardian) {
        if (!dto.phone) throw { status: 400, code: 'PHONE_REQUIRED', message: 'Telefone é obrigatório para criar responsável' };
        guardian = await prisma.guardian.create({
          data: { phone: dto.phone, name: dto.name?.trim() || '', email: dto.email?.trim().toLowerCase() || undefined, cpf: cpf || undefined, schoolId, active: true },
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
    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId, guardianId: guardian.id } },
      update: {
        status: 'PENDING_INVITE',
        relationship: rel,
        kinshipDegree: dto.kinshipDegree ?? null,
        isLegalGuardian: dto.isLegalGuardian ?? false,
        isFinancialGuardian: dto.isFinancialGuardian ?? false,
      },
      create: {
        studentId, guardianId: guardian.id, schoolId,
        relationship: rel,
        kinshipDegree: dto.kinshipDegree ?? null,
        isLegalGuardian: dto.isLegalGuardian ?? false,
        isFinancialGuardian: dto.isFinancialGuardian ?? false,
        isPrimary: ['mae', 'mãe', 'pai'].includes(rel.toLowerCase()),
        status: 'PENDING_INVITE',
      },
    });

    return guardian;
  }

  async unlinkGuardianFromStudent(schoolId: string, studentId: string, guardianId: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };
    await prisma.studentGuardian.deleteMany({ where: { studentId, guardianId } });
    return { success: true };
  }
}
