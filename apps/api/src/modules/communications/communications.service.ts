import { prisma } from '../../config/database';
import { pushQueue, reminderQueue } from '../../jobs/queues';
import { generateProtocol } from '../../utils/protocol';
import type { CreateCommunicationDto, CreateGuardianCommDto, CommunicationListQuery, GuardianRequestListQuery, UpdateGuardianStatusDto } from './communications.schemas';

export class CommunicationsService {
  // ── Staff: Listar comunicados ─────────────────────────────────────────────

  async list(schoolId: string, userId: string, role: string, query: CommunicationListQuery) {
    const { page, limit, status, eventDateFrom, eventDateTo } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { schoolId, createdBy: { not: null } };

    if (status) where.schoolStatus = status;

    if (eventDateFrom || eventDateTo) {
      where.eventDate = {
        ...(eventDateFrom ? { gte: new Date(eventDateFrom) } : {}),
        ...(eventDateTo ? { lte: new Date(eventDateTo) } : {}),
      };
    }

    // Professor vê apenas das suas turmas
    if (role === 'TEACHER') {
      where.commClasses = {
        some: {
          class: { classTeachers: { some: { teacherId: userId } } },
        },
      };
    }

    const [data, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, role: true } },
          commClasses: { include: { class: { select: { id: true, name: true } } } },
          commStudents: { include: { student: { select: { id: true, name: true } } } },
          _count: { select: { reads: true, attachments: true } },
        },
        orderBy: (eventDateFrom || eventDateTo) ? { eventDate: 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.communication.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Staff: Criar comunicado ───────────────────────────────────────────────

  async create(schoolId: string, userId: string, role: string, dto: CreateCommunicationDto) {
    // Valida permissão por escopo/role
    await this._validateScopePermission(schoolId, userId, role, dto.scope, dto.targetIds);

    const status = dto.sendNow ? 'SENT' : (dto.scheduledAt ? 'SCHEDULED' : 'DRAFT');
    const sentAt = dto.sendNow ? new Date() : undefined;

    const comm = await prisma.communication.create({
      data: {
        schoolId,
        createdBy: userId,
        schoolType: dto.schoolType,
        title: dto.title,
        body: dto.body,
        scope: dto.scope,
        audienceFilter: dto.audienceFilter ?? 'ALL',
        schoolStatus: status,
        requiresConfirmation: dto.requiresConfirmation,
        autoReminder: dto.autoReminder,
        reminderCount: 0,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        sentAt,
        // Destinos
        commClasses: dto.scope === 'CLASS'
          ? { create: dto.targetIds.map((id) => ({ classId: id })) }
          : undefined,
        commStudents: dto.scope === 'STUDENT'
          ? { create: dto.targetIds.map((id) => ({ studentId: id })) }
          : undefined,
      },
      include: {
        commClasses: { include: { class: { select: { id: true, name: true } } } },
        commStudents: { include: { student: { select: { id: true, name: true } } } },
      },
    });

    if (status === 'SENT') {
      const channels = dto.channels ?? ['notification'];

      if (channels.includes('notification')) {
        await this._enqueuePushNotifications(comm.id, schoolId, dto.scope, dto.targetIds, dto.schoolType);
      }

      // Cria notificações no inbox e envia e-mails conforme canais escolhidos
      const links = await prisma.studentGuardian.findMany({
        where: {
          status: { in: ['ACTIVE', 'PENDING_INVITE'] },
          ...(dto.scope === 'CLASS' ? { student: { classId: { in: dto.targetIds } } } : { studentId: { in: dto.targetIds } }),
        },
        select: { guardianId: true },
      });
      const uniqueGuardians = [...new Set(links.map((l) => l.guardianId))];
      await this._createNotificationsForRecipients(comm.id, uniqueGuardians);

      if (channels.includes('email')) {
        const guardianData = await prisma.guardian.findMany({
          where: { id: { in: uniqueGuardians } },
          select: { id: true, name: true, email: true },
        });
        await Promise.allSettled(
          guardianData
            .filter((g) => g.email)
            .map(async (g) => {
              let emailStatus = 'sent';
              try {
                await this._sendCommEmail(g.email!, g.name, dto.title, dto.body, schoolId);
              } catch {
                emailStatus = 'failed';
              }
              await prisma.communicationDeliveryLog.create({
                data: {
                  communicationId: comm.id,
                  guardianId: g.id,
                  channel: 'email',
                  target: 'all',
                  emailAddress: g.email,
                  emailStatus,
                  triggeredBy: userId,
                },
              });
            }),
        );
      }

      // Cria eventos na agenda automaticamente
      const classIdsForAgenda = dto.scope === 'CLASS' ? dto.targetIds : [];
      await this._createAgendaEvents(
        comm.id, schoolId, userId, dto.title, dto.schoolType, dto.scope, classIdsForAgenda,
        dto.eventDate ? new Date(dto.eventDate) : null,
      );

      if (dto.autoReminder) {
        await this._scheduleReminder(comm.id);
      }
    }

    return comm;
  }

  // ── Staff: Buscar comunicado por ID ───────────────────────────────────────

  async getById(schoolId: string, commId: string) {
    const comm = await prisma.communication.findFirst({
      where: { id: commId, schoolId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        guardian: { select: { id: true, name: true, phone: true } },
        commClasses: { include: { class: { select: { id: true, name: true } } } },
        commStudents: { include: { student: { select: { id: true, name: true } } } },
        attachments: true,
        _count: { select: { reads: true } },
      },
    });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    return comm;
  }

  // ── Staff: Enviar rascunho ────────────────────────────────────────────────

  async send(schoolId: string, commId: string, userId: string) {
    const comm = await prisma.communication.findFirst({ where: { id: commId, schoolId } });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    if (comm.schoolStatus !== 'DRAFT') {
      throw { status: 400, code: 'INVALID_STATUS', message: 'Apenas rascunhos podem ser enviados' };
    }

    const updated = await prisma.communication.update({
      where: { id: commId },
      data: { schoolStatus: 'SENT', sentAt: new Date() },
    });

    const scope = comm.scope;
    const targetIds = scope === 'CLASS'
      ? (await prisma.communicationClass.findMany({ where: { communicationId: commId } })).map((c) => c.classId)
      : (await prisma.communicationStudent.findMany({ where: { communicationId: commId } })).map((s) => s.studentId);

    await this._enqueuePushNotifications(commId, schoolId, scope, targetIds, comm.schoolType!);

    // Cria notificações no inbox de cada responsável
    const links = await prisma.studentGuardian.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING_INVITE'] },
        ...(scope === 'CLASS' ? { student: { classId: { in: targetIds } } } : { studentId: { in: targetIds } }),
      },
      select: { guardianId: true },
    });
    const uniqueGuardians = [...new Map(
      links.map((l) => [l.guardianId, l.guardianId]),
    ).keys()];
    await this._createNotificationsForRecipients(commId, uniqueGuardians);

    // Cria eventos na agenda automaticamente
    const classIdsForAgenda = scope === 'CLASS' ? targetIds : [];
    await this._createAgendaEvents(
      commId, schoolId, userId, comm.title, comm.schoolType!, scope, classIdsForAgenda, comm.eventDate,
    );

    if (comm.autoReminder) await this._scheduleReminder(commId);

    return updated;
  }

  // ── Staff: Cancelar comunicado ────────────────────────────────────────────

  async cancel(schoolId: string, commId: string, userId: string) {
    const comm = await prisma.communication.findFirst({ where: { id: commId, schoolId } });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    if (comm.schoolStatus === 'CANCELLED') {
      throw { status: 400, code: 'ALREADY_CANCELLED', message: 'Comunicado já cancelado' };
    }

    return prisma.communication.update({
      where: { id: commId },
      data: { schoolStatus: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
    });
  }

  // ── Staff: Relatório de leitura ────────────────────────────────────────────

  async getReadReport(schoolId: string, commId: string) {
    const comm = await prisma.communication.findFirst({
      where: { id: commId, schoolId },
      include: {
        commClasses: {
          include: {
            class: {
              include: {
                students: {
                  where: { active: true },
                  include: {
                    studentGuardians: {
                      where: { status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
                      include: { guardian: { select: { id: true, name: true, phone: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        commStudents: {
          include: {
            student: {
              include: {
                studentGuardians: {
                  where: { status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
                  include: { guardian: { select: { id: true, name: true, phone: true } } },
                },
              },
            },
          },
        },
        reads: {
          include: {
            guardian: { select: { id: true, name: true } },
            student: { select: { id: true, name: true } },
          },
          orderBy: { readAt: 'asc' },
        },
      },
    });

    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };

    // Build read map: guardianId → readRecord (unique per guardian per communication)
    const readMap = new Map(comm.reads.map((r) => [r.guardianId, r]));

    const seen = new Set<string>();
    const allRecipients: Array<{
      guardianId: string; guardianName: string; guardianPhone: string;
      studentId: string; studentName: string;
      sentAt: Date | null;
      receivedAt: Date | null; viewedAt: Date | null; readAt: Date | null;
      deviceType?: string | null;
    }> = [];

    const addStudentGuardians = (student: { id: string; name: string; studentGuardians: { guardianId: string; guardian: { id: string; name: string; phone: string | null } }[] }) => {
      for (const sg of student.studentGuardians) {
        const key = `${sg.guardianId}:${student.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const rec = readMap.get(sg.guardianId);
        allRecipients.push({
          guardianId: sg.guardianId,
          guardianName: sg.guardian.name || sg.guardian.phone || '',
          guardianPhone: sg.guardian.phone ?? '',
          studentId: student.id,
          studentName: student.name,
          sentAt: comm.sentAt,
          receivedAt: rec?.receivedAt ?? null,
          viewedAt: rec?.viewedAt ?? null,
          readAt: rec?.readAt ?? null,
          deviceType: rec?.deviceType,
        });
      }
    };

    if (comm.scope === 'CLASS') {
      for (const cc of comm.commClasses) {
        for (const student of cc.class.students) addStudentGuardians(student);
      }
    } else {
      for (const cs of comm.commStudents) addStudentGuardians(cs.student);
    }

    const total = allRecipients.length;
    const confirmedCount = allRecipients.filter((r) => r.readAt).length;
    const viewedCount = allRecipients.filter((r) => r.viewedAt).length;
    const receivedCount = allRecipients.filter((r) => r.receivedAt).length;

    return {
      communication: {
        id: comm.id, title: comm.title, schoolType: comm.schoolType,
        schoolStatus: comm.schoolStatus, sentAt: comm.sentAt, eventDate: comm.eventDate,
        requiresConfirmation: comm.requiresConfirmation,
        scope: comm.scope,
        commClasses: comm.commClasses.map((cc) => ({ id: cc.classId, name: (cc as unknown as { class: { name: string } }).class.name })),
      },
      stats: { total, receivedCount, viewedCount, confirmedCount },
      readRate: total > 0 ? Math.round((confirmedCount / total) * 100) : 0,
      // kept for backwards compat
      readCount: confirmedCount,
      pendingCount: total - confirmedCount,
      total,
      recipients: allRecipients,
    };
  }

  // ── Guardian: Feed de comunicados ─────────────────────────────────────────

  async getGuardianFeed(guardianId: string, filterSchoolId?: string) {
    // Busca TODOS os vínculos ativos (multi-escola)
    const links = await prisma.studentGuardian.findMany({
      where: {
        guardianId,
        status: { in: ['ACTIVE', 'PENDING_INVITE'] },
        ...(filterSchoolId ? { student: { schoolId: filterSchoolId } } : {}),
      },
      select: {
        studentId: true,
        student: { select: { classId: true, schoolId: true } },
      },
    });

    if (links.length === 0) return [];

    const classIds = links.map((l) => l.student.classId).filter((id): id is string => id !== null);
    const studentIds = links.map((l) => l.studentId);
    const schoolIds = [...new Set(links.map((l) => l.student.schoolId))];

    const communications = await prisma.communication.findMany({
      where: {
        schoolId: { in: schoolIds },
        schoolStatus: 'SENT',
        OR: [
          { scope: 'CLASS', commClasses: { some: { classId: { in: classIds } } } },
          { scope: 'STUDENT', commStudents: { some: { studentId: { in: studentIds } } } },
        ],
      },
      include: {
        school: { select: { id: true, name: true } },
        reads: { where: { guardianId } },
        attachments: true,
        _count: { select: { attachments: true } },
        commStudents: {
          where: { studentId: { in: studentIds } },
          select: { studentId: true },
        },
      },
      orderBy: [
        { schoolType: 'asc' }, // URGENT primeiro
        { sentAt: 'desc' },
      ],
    });

    return communications.map((c) => ({
      ...c,
      isRead: c.reads.length > 0,
      readAt: c.reads[0]?.readAt ?? null,
    }));
  }

  // ── Guardian: Confirmar leitura (imutável) ────────────────────────────────

  private async _upsertTrackingEvent(
    commId: string, guardianId: string, studentId: string,
    field: 'receivedAt' | 'viewedAt' | 'readAt',
    deviceType?: string, ipAddress?: string,
  ) {
    const now = new Date();
    await prisma.communicationRead.upsert({
      where: { communicationId_guardianId: { communicationId: commId, guardianId } },
      create: {
        communicationId: commId, guardianId, studentId,
        [field]: now,
        deviceType: deviceType ?? null,
        ipAddress: ipAddress ?? null,
      },
      update: {
        // Only set timestamp if not already set
        ...(field === 'receivedAt' ? { receivedAt: { set: now } } : {}),
        ...(field === 'viewedAt' ? { viewedAt: { set: now } } : {}),
        ...(field === 'readAt' ? { readAt: { set: now } } : {}),
        ...(deviceType ? { deviceType } : {}),
        ...(ipAddress ? { ipAddress } : {}),
      },
    });
  }

  async trackReceived(guardianId: string, commId: string, studentId: string, deviceType: string) {
    const comm = await prisma.communication.findFirst({ where: { id: commId, schoolStatus: 'SENT' } });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    await this._upsertTrackingEvent(commId, guardianId, studentId, 'receivedAt', deviceType);
    return { ok: true };
  }

  async trackViewed(guardianId: string, commId: string, studentId: string, deviceType: string, ipAddress?: string) {
    const comm = await prisma.communication.findFirst({ where: { id: commId, schoolStatus: 'SENT' } });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    await this._upsertTrackingEvent(commId, guardianId, studentId, 'viewedAt', deviceType, ipAddress);
    return { ok: true };
  }

  async confirmRead(
    guardianId: string,
    commId: string,
    studentId: string,
    deviceType: string,
    ipAddress: string,
  ) {
    const comm = await prisma.communication.findFirst({
      where: { id: commId, schoolStatus: 'SENT' },
    });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };

    if (!comm.requiresConfirmation) {
      throw { status: 400, code: 'NO_CONFIRMATION_REQUIRED', message: 'Comunicado não requer confirmação' };
    }

    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, studentId, status: { in: ['ACTIVE', 'PENDING_INVITE'] }, student: { schoolId: comm.schoolId } },
    });
    if (!link) throw { status: 403, code: 'FORBIDDEN', message: 'Sem acesso a este comunicado' };

    const existing = await prisma.communicationRead.findUnique({
      where: { communicationId_guardianId: { communicationId: commId, guardianId } },
    });
    if (existing?.readAt) throw { status: 409, code: 'ALREADY_READ', message: 'Comunicado já confirmado' };

    await this._upsertTrackingEvent(commId, guardianId, studentId, 'readAt', deviceType, ipAddress);
    return { ok: true };
  }

  // ── Guardian: Criar comunicado do responsável ─────────────────────────────

  async createGuardianComm(guardianId: string, schoolId: string, dto: CreateGuardianCommDto) {
    // Verifica vínculo com todos os alunos informados
    for (const studentId of dto.studentIds) {
      const link = await prisma.studentGuardian.findFirst({
        where: { guardianId, studentId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
      });
      if (!link) throw { status: 403, code: 'FORBIDDEN', message: `Sem permissão para o aluno ${studentId}` };
    }

    const protocolNumber = await generateProtocol(schoolId);

    return prisma.communication.create({
      data: {
        schoolId,
        guardianId,
        guardianType: dto.guardianType,
        title: dto.title,
        body: dto.body,
        scope: 'STUDENT',
        guardianStatus: 'SENT',
        requiresConfirmation: false,
        autoReminder: false,
        reminderCount: 0,
        protocolNumber,
        commStudents: { create: dto.studentIds.map((studentId) => ({ studentId })) },
      },
      include: {
        commStudents: { include: { student: { select: { id: true, name: true } } } },
        school: { select: { id: true, name: true } },
      },
    });
  }

  async listGuardianRequests(schoolId: string, query: GuardianRequestListQuery) {
    const { page, limit, status, type } = query;
    const where = {
      schoolId,
      guardianId: { not: null as null },
      ...(status ? { guardianStatus: status } : {}),
      ...(type ? { guardianType: type } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        include: {
          guardian: { select: { id: true, name: true, phone: true, email: true } },
          commStudents: { include: { student: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.communication.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async updateGuardianRequestStatus(schoolId: string, commId: string, userId: string, dto: UpdateGuardianStatusDto) {
    const comm = await prisma.communication.findFirst({
      where: { id: commId, schoolId, guardianId: { not: null } },
    });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Pedido não encontrado' };

    return prisma.communication.update({
      where: { id: commId },
      data: {
        guardianStatus: dto.status,
        internalNote: dto.note,
        ...(dto.status === 'RESOLVED' ? { resolvedAt: new Date(), resolvedBy: userId } : {}),
      },
    });
  }

  // ── Guardian: Meus pedidos ────────────────────────────────────────────────

  async getMyRequests(guardianId: string) {
    return prisma.communication.findMany({
      where: { guardianId },
      include: {
        commStudents: { include: { student: { select: { id: true, name: true } } } },
        school: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Staff: Resolver comunicado do responsável ─────────────────────────────

  async resolveGuardianComm(schoolId: string, commId: string, userId: string, note?: string) {
    const comm = await prisma.communication.findFirst({
      where: { id: commId, schoolId, guardianId: { not: null } },
    });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };

    return prisma.communication.update({
      where: { id: commId },
      data: {
        guardianStatus: 'RESOLVED',
        internalNote: note,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async _validateScopePermission(
    schoolId: string,
    userId: string,
    role: string,
    scope: string,
    targetIds: string[],
  ) {
    if (role === 'TEACHER') {
      // Professor só pode enviar para turmas onde é titular
      const allowed = await prisma.classTeacher.findMany({
        where: { teacherId: userId, isHomeroom: true },
        select: { classId: true },
      });
      const allowedIds = new Set(allowed.map((c) => c.classId));
      for (const id of targetIds) {
        if (!allowedIds.has(id)) {
          throw { status: 403, code: 'FORBIDDEN', message: 'Professor não é titular desta turma' };
        }
      }
    } else if (role === 'COORDINATOR') {
      // Coordenador só para suas turmas
      const allowed = await prisma.class.findMany({
        where: { schoolId, coordinatorId: userId, active: true },
        select: { id: true },
      });
      const allowedIds = new Set(allowed.map((c) => c.id));
      for (const id of targetIds) {
        if (scope === 'CLASS' && !allowedIds.has(id)) {
          throw { status: 403, code: 'FORBIDDEN', message: 'Coordenador não gerencia esta turma' };
        }
      }
    }
  }

  // ── Notificação inbox: cria registros para todos os destinatários ──────────

  private async _createNotificationsForRecipients(commId: string, guardianIds: string[]) {
    if (guardianIds.length === 0) return;
    await prisma.guardianNotification.createMany({
      data: guardianIds.map((guardianId) => ({ communicationId: commId, guardianId })),
      skipDuplicates: true,
    });
  }

  // ── Entrega manual: notificação no inbox e/ou e-mail ─────────────────────

  async deliver(
    schoolId: string,
    commId: string,
    triggeredBy: string,
    dto: {
      channels: ('notification' | 'email')[];
      target: 'all' | 'student' | 'guardian';
      studentId?: string;
      guardianId?: string;
    },
  ) {
    const comm = await prisma.communication.findFirst({
      where: { id: commId, schoolId },
      select: { id: true, schoolStatus: true, title: true, body: true, scope: true },
    });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    if (comm.schoolStatus !== 'SENT') throw { status: 400, code: 'NOT_SENT', message: 'Comunicado ainda não foi enviado' };

    // Resolve destinatários
    let targets: { guardianId: string; email: string | null; name: string }[] = [];

    if (dto.target === 'guardian' && dto.guardianId) {
      const g = await prisma.guardian.findFirst({ where: { id: dto.guardianId, schoolId } });
      if (!g) throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
      targets = [{ guardianId: g.id, email: g.email ?? null, name: g.name }];

    } else if (dto.target === 'student' && dto.studentId) {
      const links = await prisma.studentGuardian.findMany({
        where: { studentId: dto.studentId, status: { in: ['ACTIVE', 'PENDING_INVITE'] }, student: { schoolId } },
        include: { guardian: { select: { id: true, email: true, name: true } } },
      });
      targets = links.map((l) => ({ guardianId: l.guardian.id, email: l.guardian.email ?? null, name: l.guardian.name }));

    } else {
      // all
      const classIds = comm.scope === 'CLASS'
        ? (await prisma.communicationClass.findMany({ where: { communicationId: commId } })).map((c) => c.classId)
        : [];
      const studentIds = comm.scope === 'STUDENT'
        ? (await prisma.communicationStudent.findMany({ where: { communicationId: commId } })).map((s) => s.studentId)
        : [];

      const links = await prisma.studentGuardian.findMany({
        where: {
          status: { in: ['ACTIVE', 'PENDING_INVITE'] },
          ...(classIds.length > 0 ? { student: { classId: { in: classIds } } } : {}),
          ...(studentIds.length > 0 ? { studentId: { in: studentIds } } : {}),
        },
        include: { guardian: { select: { id: true, email: true, name: true } } },
      });
      const seen = new Set<string>();
      for (const l of links) {
        if (!seen.has(l.guardian.id)) {
          seen.add(l.guardian.id);
          targets.push({ guardianId: l.guardian.id, email: l.guardian.email ?? null, name: l.guardian.name });
        }
      }
    }

    if (targets.length === 0) throw { status: 400, code: 'NO_TARGETS', message: 'Nenhum destinatário encontrado' };

    const logs: { notifCount: number; emailSent: number; emailFailed: number } = { notifCount: 0, emailSent: 0, emailFailed: 0 };

    for (const t of targets) {
      for (const channel of dto.channels) {
        let emailStatus: string | undefined;

        if (channel === 'notification') {
          await prisma.guardianNotification.upsert({
            where: { guardianId_communicationId: { guardianId: t.guardianId, communicationId: commId } },
            create: { guardianId: t.guardianId, communicationId: commId },
            update: { readAt: null }, // reabre notificação como não lida
          });
          logs.notifCount++;
        }

        if (channel === 'email') {
          if (t.email) {
            try {
              await this._sendCommEmail(t.email, t.name, comm.title, comm.body, schoolId);
              emailStatus = 'sent';
              logs.emailSent++;
            } catch {
              emailStatus = 'failed';
              logs.emailFailed++;
            }
          } else {
            emailStatus = 'failed'; // sem e-mail cadastrado
            logs.emailFailed++;
          }
        }

        await prisma.communicationDeliveryLog.create({
          data: {
            communicationId: commId,
            guardianId: t.guardianId,
            channel,
            target: dto.target,
            emailAddress: channel === 'email' ? (t.email ?? null) : null,
            emailStatus: channel === 'email' ? emailStatus : null,
            triggeredBy,
          },
        });
      }
    }

    return { targets: targets.length, ...logs };
  }

  private _commTypeToEventType(schoolType: string): 'EXAM' | 'PARENT_MEETING' | 'OTHER' {
    if (schoolType === 'EXAM') return 'EXAM';
    if (schoolType === 'MEETING') return 'PARENT_MEETING';
    return 'OTHER';
  }

  private async _createAgendaEvents(
    commId: string,
    schoolId: string,
    userId: string,
    title: string,
    schoolType: string,
    scope: string,
    classIds: string[],
    eventDate?: Date | null,
    label?: string,
  ) {
    // Evento do dia do envio — início do dia para allDay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sentEvent = await prisma.agendaEvent.create({
      data: {
        schoolId,
        createdBy: userId,
        communicationId: commId,
        title: label ?? title,
        description: label ? undefined : 'Comunicado enviado',
        eventType: this._commTypeToEventType(schoolType),
        startsAt: today,
        allDay: true,
      },
    });
    if (classIds.length > 0) {
      await prisma.agendaEventClass.createMany({
        data: classIds.map((classId) => ({ eventId: sentEvent.id, classId })),
        skipDuplicates: true,
      });
    }

    // Evento na data do evento (prova ou reunião)
    if (eventDate && (schoolType === 'EXAM' || schoolType === 'MEETING')) {
      const dateEvent = await prisma.agendaEvent.create({
        data: {
          schoolId,
          createdBy: userId,
          communicationId: commId,
          title,
          description: schoolType === 'EXAM' ? 'Data da prova' : 'Data da reunião',
          eventType: schoolType === 'EXAM' ? 'EXAM' : 'PARENT_MEETING',
          startsAt: eventDate,
          allDay: true,
        },
      });
      if (classIds.length > 0) {
        await prisma.agendaEventClass.createMany({
          data: classIds.map((classId) => ({ eventId: dateEvent.id, classId })),
          skipDuplicates: true,
        });
      }
    }
  }

  private async _sendCommEmail(to: string, name: string, title: string, body: string, schoolId: string) {
    const { sendCommunicationEmail } = await import('../../utils/mailer');
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    await sendCommunicationEmail(to, name, title, body, school?.name);
  }

  async resend(schoolId: string, commId: string, userId: string) {
    const comm = await prisma.communication.findFirst({ where: { id: commId, schoolId } });
    if (!comm) throw { status: 404, code: 'COMM_NOT_FOUND', message: 'Comunicado não encontrado' };
    if (comm.schoolStatus !== 'SENT') throw { status: 400, code: 'NOT_SENT', message: 'Apenas comunicados enviados podem ser reenviados' };

    // Quem já confirmou leitura
    const reads = await prisma.communicationRead.findMany({
      where: { communicationId: commId, readAt: { not: null } },
      select: { guardianId: true },
    });
    const confirmedGuardianIds = new Set(reads.map((r) => r.guardianId));

    // Destinatários originais que ainda não confirmaram
    let pendingIds: string[] = [];
    if (comm.scope === 'CLASS') {
      const classIds = (await prisma.communicationClass.findMany({ where: { communicationId: commId } })).map((c) => c.classId);
      const links = await prisma.studentGuardian.findMany({
        where: { student: { classId: { in: classIds } }, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
        select: { guardianId: true },
      });
      pendingIds = [...new Set(links.map((l) => l.guardianId))].filter((id) => !confirmedGuardianIds.has(id));
    } else {
      const studentIds = (await prisma.communicationStudent.findMany({ where: { communicationId: commId } })).map((s) => s.studentId);
      const links = await prisma.studentGuardian.findMany({
        where: { studentId: { in: studentIds }, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
        select: { guardianId: true },
      });
      pendingIds = [...new Set(links.map((l) => l.guardianId))].filter((id) => !confirmedGuardianIds.has(id));
    }

    if (pendingIds.length === 0) throw { status: 400, code: 'ALL_CONFIRMED', message: 'Todos os responsáveis já confirmaram a leitura' };

    await prisma.communication.update({ where: { id: commId }, data: { reminderCount: { increment: 1 } } });

    await this._enqueuePushNotifications(commId, schoolId, comm.scope, pendingIds, comm.schoolType!);

    // Registra reenvio na agenda
    const classIdsForAgenda = comm.scope === 'CLASS'
      ? (await prisma.communicationClass.findMany({ where: { communicationId: commId } })).map((c) => c.classId)
      : [];
    const sentEvent = await prisma.agendaEvent.create({
      data: {
        schoolId,
        createdBy: userId,
        communicationId: commId,
        title: `Reenvio: ${comm.title}`,
        description: `Reenviado para ${pendingIds.length} responsável(is) pendente(s)`,
        eventType: 'OTHER',
        startsAt: new Date(),
        allDay: true,
      },
    });
    if (classIdsForAgenda.length > 0) {
      await prisma.agendaEventClass.createMany({
        data: classIdsForAgenda.map((classId) => ({ eventId: sentEvent.id, classId })),
        skipDuplicates: true,
      });
    }

    return { sent: pendingIds.length };
  }

  private async _enqueuePushNotifications(
    commId: string,
    schoolId: string,
    scope: string,
    targetIds: string[],
    type: string,
  ) {
    await pushQueue.add('send-push', {
      communicationId: commId,
      schoolId,
      scope,
      targetIds,
      type,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }

  private async _scheduleReminder(commId: string) {
    // Lembrete após 24h para não lidos
    await reminderQueue.add(
      'send-reminder',
      { communicationId: commId },
      { delay: 24 * 60 * 60 * 1000, attempts: 2 },
    );
  }
}
