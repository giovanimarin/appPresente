import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { redis, redisKeys } from '../../config/redis';
import { generateAccessToken } from '../../utils/jwt';
import { randomUUID } from 'crypto';
import type { PlatformLoginDto, SchoolListQuery, UpdateSchoolPlanDto, CreateSchoolDto } from './platform.schemas';

// Limites padrão por plano
const PLAN_LIMITS: Record<string, number> = {
  STARTER: 100,
  SCHOOL: 400,
  NETWORK: 1000,
  ENTERPRISE: 999999,
};

export class PlatformService {

  // ── Auth ─────────────────────────────────────────────────────────────────

  async login(dto: PlatformLoginDto) {
    const user = await prisma.platformUser.findUnique({ where: { email: dto.email } });
    if (!user || !user.active) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
    }

    await prisma.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      school_id: 'platform',
      role: 'PLATFORM',
    });

    const refreshToken = randomUUID();
    await redis.set(
      `platform_refresh:${user.id}`,
      refreshToken,
      'EX',
      60 * 60 * 24 * 7,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: 'PLATFORM' },
    };
  }

  // ── Listar escolas com métricas de saúde ─────────────────────────────────

  async listSchools(query: SchoolListQuery) {
    const { page, limit, plan, active, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (plan) where.plan = plan;
    if (active !== undefined) where.active = active;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ];
    }

    const schools = await prisma.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        cnpj: true,
        city: true,
        state: true,
        plan: true,
        active: true,
        trialEndsAt: true,
        suspendedAt: true,
        platformNote: true,
        billingEmail: true,
        maxStudents: true,
        createdAt: true,
        _count: {
          select: {
            units: true,
            classes: true,
            students: true,
            guardians: true,
            users: true,
            communications: true,
          },
        },
      },
    });

    const total = await prisma.school.count({ where });

    // Enriquece com métricas de atividade dos últimos 30 dias
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const enriched = await Promise.all(
      schools.map(async (school) => {
        const [
          activeStudents,
          activeGuardians,
          commsSent30d,
          reads30d,
          lastActivity,
          teacherCount,
        ] = await Promise.all([
          prisma.student.count({ where: { schoolId: school.id, active: true } }),
          prisma.studentGuardian.count({
            where: { status: 'ACTIVE', student: { schoolId: school.id } },
          }),
          prisma.communication.count({
            where: {
              schoolId: school.id,
              schoolStatus: 'SENT',
              sentAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.communicationRead.count({
            where: {
              communication: { schoolId: school.id },
              readAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.communication.findFirst({
            where: { schoolId: school.id, schoolStatus: 'SENT' },
            orderBy: { sentAt: 'desc' },
            select: { sentAt: true },
          }),
          prisma.user.count({
            where: { schoolId: school.id, active: true, role: 'TEACHER' },
          }),
        ]);

        // Score de saúde: 0-100
        // Critérios: envio regular (40%), leitura (40%), adoção (20%)
        const sendingScore = Math.min(commsSent30d / 8, 1) * 40; // 8+ comms/mês = 100%
        const readRate = commsSent30d > 0 ? reads30d / (commsSent30d * Math.max(activeGuardians, 1)) : 0;
        const readScore = Math.min(readRate, 1) * 40;
        const adoptionRate = school._count.students > 0
          ? activeGuardians / school._count.students
          : 0;
        const adoptionScore = Math.min(adoptionRate, 1) * 20;
        const healthScore = Math.round(sendingScore + readScore + adoptionScore);

        const planLimit = school.maxStudents ?? PLAN_LIMITS[school.plan];
        const daysUntilTrialEnd = school.trialEndsAt
          ? Math.ceil((school.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...school,
          metrics: {
            activeStudents,
            activeGuardians,
            teacherCount,
            commsSent30d,
            reads30d,
            readRate30d: commsSent30d > 0
              ? Math.round((reads30d / (commsSent30d * Math.max(activeGuardians, 1))) * 100)
              : 0,
            lastActivityAt: lastActivity?.sentAt ?? null,
            healthScore,
            planLimit,
            planUsagePct: planLimit > 0
              ? Math.round((activeStudents / planLimit) * 100)
              : 0,
            daysUntilTrialEnd,
            isTrialing: !!school.trialEndsAt && school.trialEndsAt > now,
            isTrialExpired: !!school.trialEndsAt && school.trialEndsAt <= now,
          },
        };
      }),
    );

    // Sort por score se pedido
    if (query.sort === 'engagement') {
      enriched.sort((a, b) =>
        query.order === 'desc'
          ? b.metrics.healthScore - a.metrics.healthScore
          : a.metrics.healthScore - b.metrics.healthScore,
      );
    } else if (query.sort === 'students') {
      enriched.sort((a, b) =>
        query.order === 'desc'
          ? b.metrics.activeStudents - a.metrics.activeStudents
          : a.metrics.activeStudents - b.metrics.activeStudents,
      );
    }

    return { data: enriched, total, page, limit };
  }

  // ── Métricas detalhadas de uma escola ─────────────────────────────────────

  async getSchoolHealth(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { units: { select: { id: true, name: true, active: true } } },
    });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };

    const now = new Date();
    const periods = [7, 30, 90].map((days) => {
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return { days, from };
    });

    const [
      usersByRole,
      activeStudents,
      inactiveStudents,
      guardiansByStatus,
      recentGuardianLogins,
      neverAccessedGuardians,
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        where: { schoolId, active: true },
        _count: { role: true },
      }),
      prisma.student.count({ where: { schoolId, active: true } }),
      prisma.student.count({ where: { schoolId, active: false } }),
      prisma.studentGuardian.groupBy({
        by: ['status'],
        where: { student: { schoolId } },
        _count: { status: true },
      }),
      prisma.guardian.count({
        where: { schoolId, lastSeenAt: { gte: periods[1].from } },
      }),
      prisma.guardian.count({
        where: { schoolId, activatedAt: { not: null }, lastSeenAt: null },
      }),
    ]);

    // Atividade por período
    const activity = await Promise.all(
      periods.map(async ({ days, from }) => {
        const [commsSent, reads, agendaEvents, formSubmissions] = await Promise.all([
          prisma.communication.count({
            where: { schoolId, schoolStatus: 'SENT', sentAt: { gte: from } },
          }),
          prisma.communicationRead.count({
            where: { communication: { schoolId }, readAt: { gte: from } },
          }),
          prisma.agendaEvent.count({
            where: { schoolId, createdAt: { gte: from } },
          }),
          prisma.formSubmission.count({
            where: { schoolId, submittedAt: { gte: from } },
          }),
        ]);
        return { days, commsSent, reads, agendaEvents, formSubmissions };
      }),
    );

    // Top módulos usados (últimos 30 dias)
    const commsByType = await prisma.communication.groupBy({
      by: ['schoolType'],
      where: {
        schoolId,
        schoolStatus: 'SENT',
        sentAt: { gte: periods[1].from },
        schoolType: { not: null },
      },
      _count: { schoolType: true },
    });

    // Engajamento por turma (leitura)
    const classEngagement = await prisma.class.findMany({
      where: { schoolId, active: true },
      select: {
        id: true,
        name: true,
        _count: { select: { students: true } },
      },
    });

    const planLimit = school.maxStudents ?? PLAN_LIMITS[school.plan];
    const daysUntilTrialEnd = school.trialEndsAt
      ? Math.ceil((school.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      school: {
        id: school.id,
        name: school.name,
        email: school.email,
        cnpj: school.cnpj,
        plan: school.plan,
        active: school.active,
        suspendedAt: school.suspendedAt,
        platformNote: school.platformNote,
        billingEmail: school.billingEmail,
        trialEndsAt: school.trialEndsAt,
        daysUntilTrialEnd,
        isTrialing: !!school.trialEndsAt && school.trialEndsAt > now,
        planLimit,
        units: school.units,
        createdAt: school.createdAt,
      },
      users: {
        byRole: usersByRole.reduce((acc, g) => {
          acc[g.role] = g._count.role;
          return acc;
        }, {} as Record<string, number>),
      },
      students: { active: activeStudents, inactive: inactiveStudents },
      guardians: {
        byStatus: guardiansByStatus.reduce((acc, g) => {
          acc[g.status] = g._count.status;
          return acc;
        }, {} as Record<string, number>),
        activeInLast30Days: recentGuardianLogins,
        neverAccessed: neverAccessedGuardians,
      },
      activity,
      commsByType,
      classEngagement,
    };
  }

  // ── Resumo da plataforma ──────────────────────────────────────────────────

  async getPlatformSummary() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalSchools,
      activeSchools,
      trialingSchools,
      schoolsByPlan,
      totalStudents,
      totalGuardians,
      totalComms30d,
      totalReads30d,
      newSchools30d,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { active: true } }),
      prisma.school.count({
        where: { trialEndsAt: { gt: now }, active: true },
      }),
      prisma.school.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      prisma.student.count({ where: { active: true } }),
      prisma.guardian.count({ where: { active: true } }),
      prisma.communication.count({
        where: { schoolStatus: 'SENT', sentAt: { gte: thirtyDaysAgo } },
      }),
      prisma.communicationRead.count({
        where: { readAt: { gte: thirtyDaysAgo } },
      }),
      prisma.school.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      schools: {
        total: totalSchools,
        active: activeSchools,
        suspended: totalSchools - activeSchools,
        trialing: trialingSchools,
        newLast30Days: newSchools30d,
        byPlan: schoolsByPlan.reduce((acc, g) => {
          acc[g.plan] = g._count.plan;
          return acc;
        }, {} as Record<string, number>),
      },
      users: {
        totalStudents,
        totalGuardians,
      },
      activity: {
        commsSentLast30Days: totalComms30d,
        readsLast30Days: totalReads30d,
        avgReadsPerComm: totalComms30d > 0 ? Math.round(totalReads30d / totalComms30d) : 0,
      },
    };
  }

  // ── Criar escola + admin inicial + conta de suporte ─────────────────────

  async createSchool(dto: CreateSchoolDto) {
    const existing = await prisma.school.findFirst({ where: { email: dto.email } });
    if (existing) {
      throw { status: 409, code: 'EMAIL_IN_USE', message: 'Já existe uma escola com esse e-mail' };
    }

    const adminExists = await prisma.user.findFirst({ where: { email: dto.adminEmail } });
    if (adminExists) {
      throw { status: 409, code: 'ADMIN_EMAIL_IN_USE', message: 'Já existe um usuário com esse e-mail' };
    }

    const tempPassword = 'Presente@' + Math.floor(1000 + Math.random() * 9000);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Conta de suporte da plataforma — senha definida via env
    const supportEmail = process.env.SUPPORT_EMAIL ?? 'suporte@usepresente.com.br';
    const supportPassword = process.env.SUPPORT_PASSWORD ?? 'Suporte@Presente1';
    const supportHash = await bcrypt.hash(supportPassword, 10);

    const trialEndsAt = dto.trialDays > 0
      ? new Date(Date.now() + dto.trialDays * 24 * 60 * 60 * 1000)
      : null;

    const school = await prisma.school.create({
      data: {
        name: dto.name,
        email: dto.email,
        cnpj: dto.cnpj,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        plan: dto.plan,
        trialEndsAt,
        active: true,
        users: {
          create: [
            {
              name: dto.adminName,
              email: dto.adminEmail,
              passwordHash,
              role: 'ADMIN',
              active: true,
            },
            {
              name: 'Suporte Presente',
              email: supportEmail,
              passwordHash: supportHash,
              role: 'ADMIN',
              active: true,
            },
          ],
        },
      },
      include: {
        users: {
          where: { email: { in: [dto.adminEmail, supportEmail] } },
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const admin = school.users.find((u) => u.email === dto.adminEmail);

    return {
      school: { id: school.id, name: school.name, email: school.email, plan: school.plan, trialEndsAt: school.trialEndsAt },
      admin,
      tempPassword,
    };
  }

  // ── Buscar diretor da escola ──────────────────────────────────────────────

  async getSchoolDirector(schoolId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };

    const supportEmail = process.env.SUPPORT_EMAIL ?? 'suporte@usepresente.com.br';
    const admins = await prisma.user.findMany({
      where: { schoolId, role: 'ADMIN', active: true, email: { not: supportEmail } },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return { admins };
  }

  // ── Redefinir senha do diretor ────────────────────────────────────────────

  async resetDirectorPassword(schoolId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, schoolId, role: 'ADMIN' } });
    if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };

    const newPassword = 'Presente@' + Math.floor(1000 + Math.random() * 9000);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { newPassword };
  }

  // ── Arquivar escola (soft delete) ─────────────────────────────────────────

  async archiveSchool(schoolId: string, platformUserId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };

    return prisma.school.update({
      where: { id: schoolId },
      data: { active: false, suspendedAt: new Date(), suspendedBy: platformUserId },
    });
  }

  // ── Excluir escola permanentemente ───────────────────────────────────────

  async deleteSchool(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { _count: { select: { students: true, guardians: true, communications: true } } },
    });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };

    const total = school._count.students + school._count.guardians + school._count.communications;
    if (total > 0) {
      throw {
        status: 400,
        code: 'SCHOOL_HAS_DATA',
        message: `Escola possui dados cadastrados (${school._count.students} alunos, ${school._count.guardians} responsáveis). Archive a escola ao invés de excluir.`,
      };
    }

    await prisma.school.delete({ where: { id: schoolId } });
    return { success: true };
  }

  // ── Atualizar plano / status de escola ────────────────────────────────────

  async updateSchool(schoolId: string, platformUserId: string, dto: UpdateSchoolPlanDto) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };

    const data: Record<string, unknown> = {};
    if (dto.plan !== undefined) data.plan = dto.plan;
    if (dto.trialEndsAt !== undefined) data.trialEndsAt = new Date(dto.trialEndsAt);
    if (dto.maxStudents !== undefined) data.maxStudents = dto.maxStudents;
    if (dto.billingEmail !== undefined) data.billingEmail = dto.billingEmail;
    if (dto.platformNote !== undefined) data.platformNote = dto.platformNote;
    if (dto.active !== undefined) {
      data.active = dto.active;
      if (!dto.active) {
        data.suspendedAt = new Date();
        data.suspendedBy = platformUserId;
      } else {
        data.suspendedAt = null;
        data.suspendedBy = null;
      }
    }

    return prisma.school.update({ where: { id: schoolId }, data });
  }
}
