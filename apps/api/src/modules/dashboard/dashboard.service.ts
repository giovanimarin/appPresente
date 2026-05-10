import { prisma } from '../../config/database';

export class DashboardService {
  async getSchoolStats(schoolId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalStudents,
      activeGuardians,
      pendingGuardians,
      totalCommunications,
      sentCommunications,
      totalReads,
      possibleReads,
      upcomingEvents,
      pendingSubmissions,
      classEngagement,
      neverAccessedGuardians,
    ] = await Promise.all([
      // Total alunos ativos
      prisma.student.count({ where: { schoolId, active: true } }),

      // Responsáveis ativos
      prisma.studentGuardian.count({
        where: { status: 'ACTIVE', student: { schoolId } },
      }),

      // Responsáveis com convite pendente
      prisma.studentGuardian.count({
        where: {
          status: { in: ['PENDING_INVITE', 'PENDING_APPROVAL'] },
          student: { schoolId },
        },
      }),

      // Total comunicados
      prisma.communication.count({
        where: { schoolId, createdBy: { not: null } },
      }),

      // Comunicados enviados nos últimos 30 dias
      prisma.communication.count({
        where: {
          schoolId,
          schoolStatus: 'SENT',
          sentAt: { gte: thirtyDaysAgo },
        },
      }),

      // Total de leituras nos últimos 30 dias
      prisma.communicationRead.count({
        where: {
          communication: { schoolId },
          readAt: { gte: thirtyDaysAgo },
        },
      }),

      // Total de leituras possíveis (comunicados enviados × responsáveis ativos por turma)
      prisma.communication.count({
        where: {
          schoolId,
          schoolStatus: 'SENT',
          sentAt: { gte: thirtyDaysAgo },
        },
      }),

      // Eventos próximos (7 dias)
      prisma.agendaEvent.count({
        where: {
          schoolId,
          cancelledAt: null,
          startsAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Submissões pendentes
      prisma.formSubmission.count({
        where: { schoolId, status: 'PENDING' },
      }),

      // Engajamento por turma (últimos 30 dias)
      prisma.class.findMany({
        where: { schoolId, active: true },
        select: {
          id: true,
          name: true,
          _count: { select: { students: true } },
        },
      }),

      // Responsáveis que nunca acessaram
      prisma.guardian.findMany({
        where: {
          schoolId,
          active: true,
          lastSeenAt: null,
          activatedAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          activatedAt: true,
          studentGuardians: {
            where: { status: 'ACTIVE' },
            include: { student: { select: { id: true, name: true } } },
          },
        },
        take: 20,
      }),
    ]);

    const readRate = possibleReads > 0
      ? Math.round((totalReads / (possibleReads * Math.max(activeGuardians, 1))) * 100)
      : 0;

    return {
      overview: {
        totalStudents,
        activeGuardians,
        pendingGuardians,
        totalCommunications,
        sentLast30Days: sentCommunications,
        readRateLast30Days: Math.min(readRate, 100),
        upcomingEvents,
        pendingFormSubmissions: pendingSubmissions,
      },
      classEngagement,
      neverAccessedGuardians,
    };
  }

  async getCommunicationReport(schoolId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = {
      schoolId,
      schoolStatus: 'SENT',
    };

    if (from || to) {
      where.sentAt = {};
      if (from) (where.sentAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.sentAt as Record<string, unknown>).lte = new Date(to);
    }

    const communications = await prisma.communication.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
        _count: { select: { reads: true } },
        commClasses: { include: { class: { select: { id: true, name: true } } } },
      },
      orderBy: { sentAt: 'desc' },
    });

    return communications.map((c) => ({
      id: c.id,
      title: c.title,
      schoolType: c.schoolType,
      sentAt: c.sentAt,
      author: c.author,
      classes: c.commClasses.map((cc) => cc.class),
      readCount: c._count.reads,
    }));
  }

  async getEngagementByGuardian(schoolId: string) {
    const guardians = await prisma.guardian.findMany({
      where: { schoolId, active: true, activatedAt: { not: null } },
      select: {
        id: true,
        name: true,
        phone: true,
        lastSeenAt: true,
        activatedAt: true,
        _count: { select: { communicationReads: true } },
        studentGuardians: {
          where: { status: 'ACTIVE' },
          include: { student: { select: { id: true, name: true } } },
        },
      },
      orderBy: { lastSeenAt: { sort: 'desc', nulls: 'last' } },
    });

    // Total communications sent to each guardian's classes
    return guardians.map((g) => ({
      id: g.id,
      name: g.name,
      phone: g.phone,
      lastSeenAt: g.lastSeenAt,
      activatedAt: g.activatedAt,
      readsCount: g._count.communicationReads,
      students: g.studentGuardians.map((sg) => sg.student),
    }));
  }
}
