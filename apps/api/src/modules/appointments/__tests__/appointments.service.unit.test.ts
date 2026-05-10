import { describe, it, expect } from 'vitest';

// Exporta buildOccurrences para poder testá-la isoladamente
// (a função é interna ao service — re-exportamos via módulo de teste)
import { buildOccurrences } from '../appointments.service';
import type { CreateSlotDto } from '../appointments.service';

const BASE: CreateSlotDto = {
  title: 'Atendimento',
  startsAt: '2026-05-07T16:00:00', // quarta-feira
  durationMin: 30,
};

describe('buildOccurrences', () => {
  it('retorna apenas a data de início quando sem recorrência', () => {
    const dates = buildOccurrences({ ...BASE });
    expect(dates).toHaveLength(1);
    expect(dates[0]).toEqual(new Date('2026-05-07T16:00:00'));
  });

  it('retorna apenas a data de início quando recurrenceType=NONE', () => {
    const dates = buildOccurrences({ ...BASE, recurrenceType: 'NONE' });
    expect(dates).toHaveLength(1);
  });

  it('retorna apenas a data de início quando recurrenceUntil está ausente', () => {
    const dates = buildOccurrences({ ...BASE, recurrenceType: 'WEEKLY', recurrenceDays: [3] });
    expect(dates).toHaveLength(1);
  });

  describe('WEEKLY', () => {
    it('gera slots toda quarta por 4 semanas', () => {
      const dates = buildOccurrences({
        ...BASE,
        recurrenceType: 'WEEKLY',
        recurrenceDays: [3], // quarta = 3
        recurrenceTime: '16:00',
        recurrenceUntil: '2026-05-31',
      });
      // 07/05, 14/05, 21/05, 28/05 = 4 quartas
      expect(dates).toHaveLength(4);
      dates.forEach((d) => expect(d.getDay()).toBe(3));
      dates.forEach((d) => expect(d.getHours()).toBe(16));
    });

    it('gera slots em múltiplos dias da semana', () => {
      const dates = buildOccurrences({
        ...BASE,
        startsAt: '2026-05-04T08:00:00', // segunda
        recurrenceType: 'WEEKLY',
        recurrenceDays: [1, 3, 5], // seg, qua, sex
        recurrenceTime: '08:00',
        recurrenceUntil: '2026-05-10', // apenas 1 semana
      });
      expect(dates).toHaveLength(3);
      const days = dates.map((d) => d.getDay()).sort();
      expect(days).toEqual([1, 3, 5]);
    });

    it('não gera datas anteriores ao startsAt', () => {
      // startsAt = quinta (4), recorrenceDays = [3] (quarta) — próxima quarta é depois
      const dates = buildOccurrences({
        ...BASE,
        startsAt: '2026-05-07T16:00:00', // quarta
        recurrenceType: 'WEEKLY',
        recurrenceDays: [1], // segunda — segunda anterior não conta
        recurrenceTime: '16:00',
        recurrenceUntil: '2026-05-11',
      });
      dates.forEach((d) => expect(d >= new Date('2026-05-07T16:00:00')).toBe(true));
    });

    it('não gera datas após recurrenceUntil', () => {
      const until = '2026-05-21';
      const dates = buildOccurrences({
        ...BASE,
        recurrenceType: 'WEEKLY',
        recurrenceDays: [3],
        recurrenceTime: '16:00',
        recurrenceUntil: until,
      });
      const untilDate = new Date(until + 'T23:59:59');
      dates.forEach((d) => expect(d <= untilDate).toBe(true));
    });

    it('todos os horários respeitam o recurrenceTime', () => {
      const dates = buildOccurrences({
        ...BASE,
        recurrenceType: 'WEEKLY',
        recurrenceDays: [3],
        recurrenceTime: '09:30',
        recurrenceUntil: '2026-05-31',
      });
      dates.forEach((d) => {
        expect(d.getHours()).toBe(9);
        expect(d.getMinutes()).toBe(30);
      });
    });
  });

  describe('BIWEEKLY', () => {
    it('gera slots a cada 2 semanas', () => {
      const dates = buildOccurrences({
        ...BASE,
        recurrenceType: 'BIWEEKLY',
        recurrenceDays: [3], // quarta
        recurrenceTime: '16:00',
        recurrenceUntil: '2026-06-30',
      });
      // 07/05, 21/05, 04/06, 18/06 = 4 ocorrências
      expect(dates).toHaveLength(4);
      // Verifica gap de 14 dias entre cada data
      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(14);
      }
    });
  });

  describe('DAILY', () => {
    it('gera um slot por dia no intervalo', () => {
      const dates = buildOccurrences({
        ...BASE,
        startsAt: '2026-05-01T10:00:00',
        recurrenceType: 'DAILY',
        recurrenceTime: '10:00',
        recurrenceUntil: '2026-05-05',
      });
      expect(dates).toHaveLength(5);
    });

    it('todos os dias têm o horário correto', () => {
      const dates = buildOccurrences({
        ...BASE,
        startsAt: '2026-05-01T14:00:00',
        recurrenceType: 'DAILY',
        recurrenceTime: '14:00',
        recurrenceUntil: '2026-05-03',
      });
      dates.forEach((d) => expect(d.getHours()).toBe(14));
    });

    it('startsAt = recurrenceUntil gera exatamente 1 ocorrência', () => {
      const dates = buildOccurrences({
        ...BASE,
        startsAt: '2026-05-01T10:00:00',
        recurrenceType: 'DAILY',
        recurrenceTime: '10:00',
        recurrenceUntil: '2026-05-01',
      });
      expect(dates).toHaveLength(1);
    });
  });
});
