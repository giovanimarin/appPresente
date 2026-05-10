import { prisma } from '../../config/database';
import { randomUUID } from 'crypto';

// ── Tipos de recorrência suportados ──────────────────────────────────────────
// recurrenceType: 'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY'
// recurrenceDays: dias da semana (0=Dom … 6=Sáb) — usado em WEEKLY/BIWEEKLY
// recurrenceTime: 'HH:MM' — hora do slot quando recorrente
// recurrenceUntil: data limite da série (ISO string)

export type CreateSlotDto = {
  title: string;
  notes?: string;
  startsAt: string;           // usado para slot único ou como "primeira ocorrência" na recorrência
  durationMin?: number;
  scope?: string;
  classId?: string;
  studentId?: string;
  // recorrência
  recurrenceType?: 'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY';
  recurrenceDays?: number[];  // 0-6 (dom-sáb)
  recurrenceTime?: string;    // 'HH:MM'
  recurrenceUntil?: string;   // ISO date string
};

export function buildOccurrences(dto: CreateSlotDto): Date[] {
  const { recurrenceType, recurrenceDays, recurrenceTime, recurrenceUntil, startsAt } = dto;

  if (!recurrenceType || recurrenceType === 'NONE') return [new Date(startsAt)];

  if (!recurrenceUntil) return [new Date(startsAt)];

  // Parse time
  const [hh, mm] = (recurrenceTime ?? '08:00').split(':').map(Number);
  const until = new Date(recurrenceUntil);
  until.setHours(23, 59, 59, 999);

  const dates: Date[] = [];
  const cursor = new Date(startsAt);
  cursor.setHours(hh, mm, 0, 0);

  const stepDays = recurrenceType === 'BIWEEKLY' ? 14 : recurrenceType === 'DAILY' ? 1 : 7;

  if (recurrenceType === 'DAILY') {
    while (cursor <= until) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  // WEEKLY / BIWEEKLY: percorre semana a semana pelos dias selecionados
  const days = recurrenceDays?.length ? [...recurrenceDays].sort() : [cursor.getDay()];

  // Começa na semana da data inicial
  const weekStart = new Date(cursor);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // domingo da semana
  weekStart.setHours(hh, mm, 0, 0);

  while (weekStart <= until) {
    for (const dow of days) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + dow);
      d.setHours(hh, mm, 0, 0);
      if (d >= new Date(startsAt) && d <= until) {
        dates.push(new Date(d));
      }
    }
    weekStart.setDate(weekStart.getDate() + stepDays);
  }

  return dates;
}

export class AppointmentsService {
  // ── Staff: gerenciar slots ────────────────────────────────────────────────

  async createSlot(schoolId: string, staffId: string, dto: CreateSlotDto) {
    const occurrences = buildOccurrences(dto);
    const isRecurring = occurrences.length > 1;
    const recurrenceGroupId = isRecurring ? randomUUID() : undefined;
    const durationMin = dto.durationMin ?? 30;

    const base = {
      schoolId,
      staffId,
      title: dto.title.trim(),
      notes: dto.notes?.trim() || undefined,
      durationMin,
      scope: dto.scope ?? 'ALL',
      classId: dto.classId || undefined,
      studentId: dto.studentId || undefined,
      status: 'AVAILABLE' as const,
      recurrenceGroupId,
    };

    if (!isRecurring) {
      return prisma.appointmentSlot.create({
        data: { ...base, startsAt: new Date(dto.startsAt) },
        include: { staff: { select: { id: true, name: true, role: true } }, booking: true },
      });
    }

    // Cria todos os slots da série em lote
    await prisma.appointmentSlot.createMany({
      data: occurrences.map((startsAt) => ({ ...base, startsAt })),
    });

    const created = await prisma.appointmentSlot.findMany({
      where: { recurrenceGroupId },
      include: { staff: { select: { id: true, name: true, role: true } } },
      orderBy: { startsAt: 'asc' },
    });

    return { recurrenceGroupId, count: created.length, slots: created };
  }

  async listSlots(schoolId: string, userId: string, role: string, query: {
    from?: string;
    to?: string;
    staffId?: string;
    status?: string;
  } = {}) {
    const where: Record<string, unknown> = { schoolId };

    if (role === 'TEACHER') where.staffId = userId;
    else if (query.staffId) where.staffId = query.staffId;

    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return prisma.appointmentSlot.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true, grade: true } },
        student: { select: { id: true, name: true } },
        booking: {
          include: {
            guardian: { select: { id: true, name: true, phone: true } },
            student: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async cancelSlot(schoolId: string, slotId: string, userId: string, role: string) {
    const slot = await prisma.appointmentSlot.findFirst({ where: { id: slotId, schoolId } });
    if (!slot) throw { status: 404, code: 'SLOT_NOT_FOUND', message: 'Horário não encontrado' };
    if (role === 'TEACHER' && slot.staffId !== userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Sem permissão para cancelar este horário' };
    }
    return prisma.appointmentSlot.update({
      where: { id: slotId },
      data: { status: 'CANCELLED' },
    });
  }

  async cancelSlotGroup(schoolId: string, slotId: string, userId: string, role: string, mode: 'this' | 'future' | 'all') {
    const slot = await prisma.appointmentSlot.findFirst({ where: { id: slotId, schoolId } });
    if (!slot) throw { status: 404, code: 'SLOT_NOT_FOUND', message: 'Horário não encontrado' };
    if (!slot.recurrenceGroupId) {
      // slot avulso — cancela ele mesmo
      return this.cancelSlot(schoolId, slotId, userId, role);
    }
    if (role === 'TEACHER' && slot.staffId !== userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Sem permissão' };
    }

    const groupWhere: Record<string, unknown> = {
      recurrenceGroupId: slot.recurrenceGroupId,
      status: 'AVAILABLE',
    };
    if (mode === 'this') {
      return prisma.appointmentSlot.update({ where: { id: slotId }, data: { status: 'CANCELLED' } });
    }
    if (mode === 'future') {
      groupWhere.startsAt = { gte: slot.startsAt };
    }
    // 'all' or 'future'
    const { count } = await prisma.appointmentSlot.updateMany({
      where: groupWhere,
      data: { status: 'CANCELLED' },
    });
    return { cancelled: count };
  }

  async deleteSlot(schoolId: string, slotId: string, userId: string, role: string) {
    const slot = await prisma.appointmentSlot.findFirst({ where: { id: slotId, schoolId } });
    if (!slot) throw { status: 404, code: 'SLOT_NOT_FOUND', message: 'Horário não encontrado' };
    if (role === 'TEACHER' && slot.staffId !== userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Sem permissão' };
    }
    if (slot.status === 'BOOKED') {
      throw { status: 400, code: 'SLOT_BOOKED', message: 'Horário já reservado. Cancele antes de excluir.' };
    }
    await prisma.appointmentSlot.delete({ where: { id: slotId } });
    return { success: true };
  }

  // ── Guardian: ver e reservar slots ───────────────────────────────────────

  async listAvailableSlots(schoolId: string, guardianId: string, query: {
    from?: string;
    to?: string;
    staffId?: string;
  } = {}) {
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId, status: 'ACTIVE', student: { schoolId } },
      select: { studentId: true, student: { select: { classId: true } } },
    });
    const studentIds = links.map((l) => l.studentId);
    const classIds = links.map((l) => l.student.classId).filter(Boolean) as string[];

    const where: Record<string, unknown> = {
      schoolId,
      status: 'AVAILABLE',
      startsAt: {
        gte: query.from ? new Date(query.from) : new Date(),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
      OR: [
        { scope: 'ALL' },
        { scope: 'CLASS', classId: { in: classIds } },
        { scope: 'STUDENT', studentId: { in: studentIds } },
      ],
    };
    if (query.staffId) where.staffId = query.staffId;

    return prisma.appointmentSlot.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true, grade: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async bookSlot(schoolId: string, guardianId: string, dto: {
    slotId: string;
    studentId: string;
    notes?: string;
  }) {
    const slot = await prisma.appointmentSlot.findFirst({ where: { id: dto.slotId, schoolId, status: 'AVAILABLE' } });
    if (!slot) throw { status: 404, code: 'SLOT_NOT_AVAILABLE', message: 'Horário indisponível' };

    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, studentId: dto.studentId, status: 'ACTIVE' },
    });
    if (!link) throw { status: 403, code: 'FORBIDDEN', message: 'Aluno não vinculado a este responsável' };

    return prisma.$transaction(async (tx) => {
      await tx.appointmentSlot.update({ where: { id: dto.slotId }, data: { status: 'BOOKED' } });
      return tx.appointmentBooking.create({
        data: {
          slotId: dto.slotId,
          guardianId,
          studentId: dto.studentId,
          notes: dto.notes?.trim() || undefined,
          status: 'CONFIRMED',
        },
        include: {
          slot: { include: { staff: { select: { id: true, name: true } } } },
          student: { select: { id: true, name: true } },
        },
      });
    });
  }

  async cancelBooking(schoolId: string, bookingId: string, cancelledBy: 'guardian' | 'staff', actorId: string) {
    const booking = await prisma.appointmentBooking.findFirst({
      where: { id: bookingId, slot: { schoolId } },
      include: { slot: true },
    });
    if (!booking) throw { status: 404, code: 'BOOKING_NOT_FOUND', message: 'Agendamento não encontrado' };
    if (booking.status === 'CANCELLED') throw { status: 400, code: 'ALREADY_CANCELLED', message: 'Já cancelado' };

    if (cancelledBy === 'guardian' && booking.guardianId !== actorId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Sem permissão para cancelar este agendamento' };
    }

    await prisma.$transaction([
      prisma.appointmentBooking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy },
      }),
      prisma.appointmentSlot.update({
        where: { id: booking.slotId },
        data: { status: 'AVAILABLE' },
      }),
    ]);

    return { success: true };
  }

  async listMyBookings(guardianId: string, query: { from?: string; to?: string } = {}) {
    const where: Record<string, unknown> = { guardianId };
    if (query.from || query.to) {
      where.slot = {
        startsAt: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      };
    }
    return prisma.appointmentBooking.findMany({
      where,
      include: {
        slot: {
          include: {
            staff: { select: { id: true, name: true, role: true } },
            school: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        student: { select: { id: true, name: true } },
      },
      orderBy: { slot: { startsAt: 'asc' } },
    });
  }

  async getSlot(schoolId: string, slotId: string) {
    const slot = await prisma.appointmentSlot.findFirst({
      where: { id: slotId, schoolId },
      include: {
        staff: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true, grade: true } },
        student: { select: { id: true, name: true } },
        booking: {
          include: {
            guardian: { select: { id: true, name: true, phone: true } },
            student: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!slot) throw { status: 404, code: 'SLOT_NOT_FOUND', message: 'Horário não encontrado' };
    return slot;
  }
}
