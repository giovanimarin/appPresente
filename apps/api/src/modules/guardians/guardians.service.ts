import { prisma } from '../../config/database';
import { sendSms } from '../../utils/sms';
import { generateOtp, storeOtp } from '../../utils/otp';
import type { ActivateGuardianDto, UpdateGuardianDto, InviteGuardianDto, StaffUpdateGuardianDto } from './guardians.schemas';

const MAX_GUARDIANS_PER_STUDENT = 5;

export class GuardiansService {
  async activate(guardianId: string, schoolId: string, dto: ActivateGuardianDto) {
    const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };

    // Verifica se o aluno pertence à escola
    const student = await prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    });
    if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Aluno não encontrado' };

    // Conta responsáveis já vinculados
    const existingCount = await prisma.studentGuardian.count({
      where: { studentId: dto.studentId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
    });
    if (existingCount >= MAX_GUARDIANS_PER_STUDENT) {
      throw { status: 400, code: 'MAX_GUARDIANS_REACHED', message: 'Máximo de 5 responsáveis por aluno' };
    }

    // Verifica se já existe vínculo
    const existingLink = await prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId: dto.studentId, guardianId } },
    });

    const isFirstAccess = !guardian.activatedAt;

    // Atualiza dados do guardian
    const updated = await prisma.guardian.update({
      where: { id: guardianId },
      data: {
        name: dto.name,
        email: dto.email,
        pushToken: dto.pushToken,
        deviceType: dto.deviceType,
        activatedAt: guardian.activatedAt ?? new Date(),
      },
    });

    // Cria ou atualiza vínculo
    if (!existingLink) {
      await prisma.studentGuardian.create({
        data: {
          studentId: dto.studentId,
          guardianId,
          schoolId,
          relationship: dto.relationship,
          isPrimary: false,
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });
    } else if (existingLink.status !== 'ACTIVE') {
      await prisma.studentGuardian.update({
        where: { studentId_guardianId: { studentId: dto.studentId, guardianId } },
        data: { status: 'ACTIVE', activatedAt: new Date(), relationship: dto.relationship },
      });
    }

    return { guardian: updated, isFirstAccess };
  }

  async getMe(guardianId: string) {
    return prisma.guardian.findUnique({
      where: { id: guardianId },
      include: {
        studentGuardians: {
          where: { status: 'ACTIVE' },
          include: {
            student: { include: { class: { select: { id: true, name: true, grade: true } } } },
          },
        },
      },
    });
  }

  async updateMe(guardianId: string, dto: UpdateGuardianDto) {
    return prisma.guardian.update({
      where: { id: guardianId },
      data: dto,
    });
  }

  async invite(guardianId: string, schoolId: string, dto: InviteGuardianDto) {
    // Verifica se o aluno pertence à escola e ao responsável que convida
    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, studentId: dto.studentId, status: 'ACTIVE' },
    });
    if (!link) throw { status: 403, code: 'FORBIDDEN', message: 'Sem permissão para convidar para este aluno' };

    // Conta responsáveis
    const count = await prisma.studentGuardian.count({
      where: { studentId: dto.studentId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
    });
    if (count >= MAX_GUARDIANS_PER_STUDENT) {
      throw { status: 400, code: 'MAX_GUARDIANS_REACHED', message: 'Máximo de 5 responsáveis por aluno' };
    }

    // Busca ou cria o guardian pelo telefone
    let invitee = await prisma.guardian.findFirst({ where: { phone: dto.phone } });
    if (!invitee) {
      invitee = await prisma.guardian.create({
        data: { phone: dto.phone, name: '', schoolId, active: true },
      });
    }

    // Cria vínculo pendente
    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: dto.studentId, guardianId: invitee.id } },
      update: { status: 'PENDING_INVITE', invitedBy: guardianId, invitedAt: new Date() },
      create: {
        studentId: dto.studentId,
        guardianId: invitee.id,
        schoolId,
        relationship: dto.relationship,
        isPrimary: false,
        status: 'PENDING_INVITE',
        invitedBy: guardianId,
        invitedAt: new Date(),
      },
    });

    // Envia OTP por SMS
    const code = generateOtp();
    await storeOtp(dto.phone, code);
    await sendSms(dto.phone, `Você foi convidado para acompanhar seu filho no Presente. Código de acesso: ${code}`);

    return { message: 'Convite enviado com sucesso' };
  }

  async listPending(schoolId: string) {
    return prisma.guardian.findMany({
      where: { schoolId, active: true, activatedAt: null },
      include: {
        studentGuardians: {
          include: { student: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resendInvite(schoolId: string, guardianId: string) {
    const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };

    const code = generateOtp();
    await storeOtp(guardian.phone, code);
    await sendSms(guardian.phone, `Seu acesso ao Presente. Código: ${code}`);

    return { message: 'Convite reenviado' };
  }

  // ── Multi-escola: escolas e preferências do responsável ──────────────────

  async getMySchools(guardianId: string) {
    // Todas as escolas onde o responsável tem alunos vinculados
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            schoolId: true,
            school: { select: { id: true, name: true, logoUrl: true } },
            class: { select: { id: true, name: true, grade: true } },
          },
        },
      },
    });

    // Agrupa por escola
    const schoolMap = new Map<string, {
      school: { id: string; name: string; logoUrl: string | null };
      students: { id: string; name: string; classId: string; className: string; grade: string; relationship: string }[];
    }>();

    for (const link of links) {
      const sid = link.student.schoolId;
      if (!schoolMap.has(sid)) {
        schoolMap.set(sid, { school: link.student.school, students: [] });
      }
      schoolMap.get(sid)!.students.push({
        id: link.student.id,
        name: link.student.name,
        classId: link.student.class?.id ?? '',
        className: link.student.class?.name ?? '',
        grade: link.student.class?.grade ?? '',
        relationship: link.relationship,
      });
    }

    // Busca ou cria preferências para cada escola
    const schoolIds = [...schoolMap.keys()];
    const existingPrefs = await prisma.guardianSchoolPreference.findMany({
      where: { guardianId, schoolId: { in: schoolIds } },
    });

    const DEFAULT_COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#8b5cf6', '#f43f5e', '#f59e0b', '#14b8a6', '#f97316'];
    const prefMap = new Map(existingPrefs.map((p) => [p.schoolId, p]));

    // Cria preferências faltantes com cor automática
    const missing = schoolIds.filter((id) => !prefMap.has(id));
    if (missing.length > 0) {
      const toCreate = missing.map((schoolId, i) => ({
        guardianId,
        schoolId,
        color: DEFAULT_COLORS[(existingPrefs.length + i) % DEFAULT_COLORS.length],
      }));
      await prisma.guardianSchoolPreference.createMany({ data: toCreate, skipDuplicates: true });
      const newPrefs = await prisma.guardianSchoolPreference.findMany({
        where: { guardianId, schoolId: { in: missing } },
      });
      newPrefs.forEach((p) => prefMap.set(p.schoolId, p));
    }

    return schoolIds.map((schoolId) => {
      const entry = schoolMap.get(schoolId)!;
      const pref = prefMap.get(schoolId);
      return {
        school: entry.school,
        students: entry.students,
        preference: { color: pref?.color ?? '#6366f1', nickname: pref?.nickname ?? null },
      };
    });
  }

  async updateSchoolPreference(guardianId: string, schoolId: string, data: { color?: string; nickname?: string }) {
    // Valida que o responsável tem acesso a essa escola
    const hasAccess = await prisma.studentGuardian.findFirst({
      where: { guardianId, status: { in: ['ACTIVE', 'PENDING_INVITE'] }, student: { schoolId } },
    });
    if (!hasAccess) throw { status: 403, code: 'FORBIDDEN', message: 'Sem acesso a esta escola' };

    return prisma.guardianSchoolPreference.upsert({
      where: { guardianId_schoolId: { guardianId, schoolId } },
      update: data,
      create: { guardianId, schoolId, ...data },
    });
  }

  // ── Staff: CRUD de responsáveis ───────────────────────────────────────────

  async create(schoolId: string, dto: { name: string; phone: string; email?: string; cpf?: string }) {
    if (!dto.phone?.trim()) throw { status: 400, code: 'PHONE_REQUIRED', message: 'Telefone é obrigatório' };
    const existingPhone = await prisma.guardian.findFirst({ where: { phone: dto.phone.trim() } });
    if (existingPhone) throw { status: 409, code: 'PHONE_IN_USE', message: 'Já existe um responsável com este telefone' };
    const cpf = dto.cpf?.replace(/\D/g, '') || undefined;
    if (cpf) {
      const existingCpf = await prisma.guardian.findFirst({ where: { cpf } });
      if (existingCpf) throw { status: 409, code: 'CPF_IN_USE', message: 'Já existe um responsável com este CPF' };
    }
    return prisma.guardian.create({
      data: {
        schoolId,
        name: dto.name?.trim() || '',
        phone: dto.phone.trim(),
        email: dto.email?.trim().toLowerCase() || undefined,
        cpf: cpf || undefined,
        active: true,
      },
    });
  }

  async listAll(schoolId: string, userId: string, role: string, query: { search?: string; status?: string; includeInactive?: boolean } = {}) {
    const where: Record<string, unknown> = { schoolId };
    if (!query.includeInactive) where.active = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { cpf: { contains: query.search.replace(/\D/g, '') } },
      ];
    }
    if (query.status === 'activated') where.activatedAt = { not: null };
    if (query.status === 'pending') where.activatedAt = null;

    if (role === 'TEACHER') {
      const teacherClasses = await prisma.classTeacher.findMany({ where: { teacherId: userId }, select: { classId: true } });
      const classIds = teacherClasses.map((c) => c.classId);
      where.studentGuardians = { some: { student: { classId: { in: classIds }, schoolId }, status: { in: ['ACTIVE', 'PENDING_INVITE'] } } };
    }

    const [data, total] = await Promise.all([
      prisma.guardian.findMany({
        where,
        include: {
          studentGuardians: {
            where: { status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
            include: { student: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.guardian.count({ where }),
    ]);
    return { data, total };
  }

  async getById(schoolId: string, guardianId: string) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, schoolId },
      include: {
        studentGuardians: {
          where: { status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
          include: {
            student: {
              select: { id: true, name: true, class: { select: { id: true, name: true, grade: true } } },
            },
          },
        },
      },
    });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
    return guardian;
  }

  async staffUpdate(schoolId: string, guardianId: string, dto: StaffUpdateGuardianDto) {
    const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
    if (dto.phone) {
      const conflict = await prisma.guardian.findFirst({ where: { phone: dto.phone.trim(), NOT: { id: guardianId } } });
      if (conflict) throw { status: 409, code: 'PHONE_IN_USE', message: 'Já existe um responsável com este telefone' };
    }
    const cpf = dto.cpf !== undefined ? (dto.cpf ? dto.cpf.replace(/\D/g, '') || null : null) : undefined;
    if (cpf) {
      const conflict = await prisma.guardian.findFirst({ where: { cpf, NOT: { id: guardianId } } });
      if (conflict) throw { status: 409, code: 'CPF_IN_USE', message: 'Já existe um responsável com este CPF' };
    }
    return prisma.guardian.update({
      where: { id: guardianId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.email !== undefined && { email: dto.email?.trim().toLowerCase() || null }),
        ...(cpf !== undefined && { cpf }),
      },
    });
  }

  async setGuardianActive(schoolId: string, guardianId: string, active: boolean) {
    const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
    return prisma.guardian.update({ where: { id: guardianId }, data: { active }, select: { id: true, active: true } });
  }

  async deleteGuardianPermanent(schoolId: string, guardianId: string) {
    const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };

    const linkedCount = await prisma.studentGuardian.count({ where: { guardianId } });
    if (linkedCount > 0) {
      throw {
        status: 400,
        code: 'GUARDIAN_HAS_STUDENTS',
        message: `Este responsável está vinculado a ${linkedCount} aluno(s). Desvincule antes de excluir.`,
      };
    }

    await prisma.formSubmission.deleteMany({ where: { guardianId } });
    await prisma.guardian.delete({ where: { id: guardianId } });
    return { success: true };
  }

  async approveLink(schoolId: string, token: string, approvedBy: string) {
    // token aqui é o guardianId — endpoint POST /guardians/link/:token/approve
    const guardian = await prisma.guardian.findFirst({ where: { id: token, schoolId } });
    if (!guardian) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };

    await prisma.studentGuardian.updateMany({
      where: { guardianId: token, status: 'PENDING_APPROVAL' },
      data: { status: 'ACTIVE', approvedBy, approvedAt: new Date() },
    });

    return { message: 'Vínculo aprovado com sucesso' };
  }
}
