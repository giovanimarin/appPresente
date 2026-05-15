import { prisma } from '../../config/database';
import { pushQueue } from '../../jobs/queues';
import type { CreateEventDto, UpdateEventDto, EventListQuery } from './agenda.schemas';

export class AgendaService {
  // ── Staff: Listar eventos ─────────────────────────────────────────────────

  async list(schoolId: string, userId: string, role: string, query: EventListQuery) {
    const { page, limit, classId, eventType, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      schoolId,
      cancelledAt: null,
    };

    if (eventType) where.eventType = eventType;

    if (from || to) {
      where.startsAt = {};
      if (from) (where.startsAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startsAt as Record<string, unknown>).lte = new Date(to);
    }

    if (classId) {
      where.eventClasses = { some: { classId } };
    } else if (role === 'TEACHER') {
      where.eventClasses = {
        some: {
          class: { classTeachers: { some: { teacherId: userId } } },
        },
      };
    }

    const [data, total] = await Promise.all([
      prisma.agendaEvent.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, role: true } },
          eventClasses: { include: { class: { select: { id: true, name: true } } } },
          _count: { select: { attachments: true } },
        },
        orderBy: { startsAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.agendaEvent.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Staff: Criar evento ───────────────────────────────────────────────────

  async create(schoolId: string, userId: string, role: string, dto: CreateEventDto) {
    // Valida permissão de turmas para professor
    await this._validateClassPermission(schoolId, userId, role, dto.classIds);

    // RN-16: Eventos só podem ser criados para datas futuras
    if (new Date(dto.startsAt) < new Date()) {
      throw { status: 400, code: 'PAST_DATE', message: 'Eventos só podem ser criados para datas futuras' };
    }

    const event = await prisma.agendaEvent.create({
      data: {
        schoolId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType,
        startsAt: new Date(dto.startsAt),
        allDay: true,
        eventClasses: {
          create: dto.classIds.map((classId) => ({ classId })),
        },
      },
      include: {
        eventClasses: { include: { class: { select: { id: true, name: true } } } },
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return event;
  }

  // ── Staff: Buscar evento por ID ───────────────────────────────────────────

  async getById(schoolId: string, eventId: string) {
    const event = await prisma.agendaEvent.findFirst({
      where: { id: eventId, schoolId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        eventClasses: { include: { class: { select: { id: true, name: true } } } },
        attachments: true,
      },
    });
    if (!event) throw { status: 404, code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado' };
    return event;
  }

  // ── Staff: Atualizar evento ───────────────────────────────────────────────

  async update(schoolId: string, eventId: string, userId: string, role: string, dto: UpdateEventDto) {
    const event = await prisma.agendaEvent.findFirst({ where: { id: eventId, schoolId } });
    if (!event) throw { status: 404, code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado' };

    // RN-17: Evento passado só editável por admin
    if (event.startsAt < new Date() && role !== 'ADMIN') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Apenas administradores podem editar eventos passados' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (dto.classIds) {
        await tx.agendaEventClass.deleteMany({ where: { eventId } });
        await tx.agendaEventClass.createMany({
          data: dto.classIds.map((classId) => ({ eventId, classId })),
        });
      }

      return tx.agendaEvent.update({
        where: { id: eventId },
        data: {
          title: dto.title,
          description: dto.description,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        },
        include: {
          eventClasses: { include: { class: { select: { id: true, name: true } } } },
        },
      });
    });

    return updated;
  }

  // ── Staff: Cancelar evento ────────────────────────────────────────────────

  async cancel(schoolId: string, eventId: string, userId: string) {
    const event = await prisma.agendaEvent.findFirst({ where: { id: eventId, schoolId } });
    if (!event) throw { status: 404, code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado' };
    if (event.cancelledAt) {
      throw { status: 400, code: 'ALREADY_CANCELLED', message: 'Evento já cancelado' };
    }

    const updated = await prisma.agendaEvent.update({
      where: { id: eventId },
      data: { cancelledAt: new Date(), cancelledBy: userId },
      include: {
        eventClasses: { include: { class: { select: { id: true, name: true } } } },
      },
    });

    // RN-18: Cancellation sends notification to all involved guardians
    const classIds = updated.eventClasses.map((ec: { classId: string }) => ec.classId);
    await this._enqueueEventNotification(eventId, schoolId, classIds, 'EVENT_CANCELLED');

    return updated;
  }

  async deletePermanent(schoolId: string, eventId: string) {
    const event = await prisma.agendaEvent.findFirst({ where: { id: eventId, schoolId } });
    if (!event) throw { status: 404, code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado' };
    await prisma.agendaEvent.delete({ where: { id: eventId } });
    return { success: true };
  }

  // ── Guardian: Feed de eventos ─────────────────────────────────────────────

  async getGuardianFeed(guardianId: string, _schoolId: string, days = 30) {
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
      select: { student: { select: { classId: true, schoolId: true } } },
    });

    if (links.length === 0) return [];

    const classIds = [...new Set(links.map((l) => l.student.classId).filter(Boolean))] as string[];
    const schoolIds = [...new Set(links.map((l) => l.student.schoolId))];
    const from = new Date();
    from.setHours(0, 0, 0, 0); // início do dia de hoje
    const to = new Date();
    to.setDate(to.getDate() + days);

    return prisma.agendaEvent.findMany({
      where: {
        schoolId: { in: schoolIds },
        cancelledAt: null,
        startsAt: { gte: from, lte: to },
        ...(classIds.length > 0 ? { eventClasses: { some: { classId: { in: classIds } } } } : {}),
      },
      include: {
        eventClasses: { include: { class: { select: { id: true, name: true } } } },
        attachments: { select: { id: true, filename: true, contentType: true, size: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async _validateClassPermission(
    schoolId: string,
    userId: string,
    role: string,
    classIds: string[],
  ) {
    if (role === 'TEACHER') {
      const allowed = await prisma.classTeacher.findMany({
        where: { teacherId: userId, isHomeroom: true },
        select: { classId: true },
      });
      const allowedIds = new Set(allowed.map((c) => c.classId));
      for (const id of classIds) {
        if (!allowedIds.has(id)) {
          throw { status: 403, code: 'FORBIDDEN', message: 'Professor não é titular desta turma' };
        }
      }
    } else if (role === 'COORDINATOR') {
      const allowed = await prisma.class.findMany({
        where: { schoolId, coordinatorId: userId, active: true },
        select: { id: true },
      });
      const allowedIds = new Set(allowed.map((c) => c.id));
      for (const id of classIds) {
        if (!allowedIds.has(id)) {
          throw { status: 403, code: 'FORBIDDEN', message: 'Coordenador não gerencia esta turma' };
        }
      }
    }
  }

  private async _enqueueEventNotification(
    eventId: string,
    schoolId: string,
    classIds: string[],
    type: string,
  ) {
    await pushQueue.add('send-event-push', {
      eventId,
      schoolId,
      classIds,
      type,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }
}
