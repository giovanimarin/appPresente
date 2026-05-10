import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../test/app';
import { setupTestDb, clearDb, factory, testPrisma } from '../../../test/setup';
import { authHeader } from '../../../test/auth-helper';

beforeAll(async () => { await setupTestDb(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await testPrisma.$disconnect(); });

describe('Appointments — Staff', () => {
  async function seed() {
    const school  = await factory.school();
    const admin   = await factory.user(school.id, { role: 'ADMIN' });
    const teacher = await factory.teacher(school.id);
    const klass   = await factory.class(school.id);
    const student = await factory.student(school.id, klass.id);
    return { school, admin, teacher, klass, student };
  }

  describe('POST /api/v1/appointments/slots', () => {
    it('cria slot avulso', async () => {
      const { school, admin } = await seed();
      const res = await request(app)
        .post('/api/v1/appointments/slots')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({ title: 'Atendimento', startsAt: '2030-05-07T16:00:00.000Z', durationMin: 30 });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Atendimento');
      expect(res.body.status).toBe('AVAILABLE');
      expect(res.body.recurrenceGroupId).toBeNull();
    });

    it('cria série semanal e retorna múltiplos slots', async () => {
      const { school, admin } = await seed();
      const res = await request(app)
        .post('/api/v1/appointments/slots')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({
          title: 'Semanal',
          startsAt: '2030-05-07T16:00:00.000Z',
          durationMin: 30,
          recurrenceType: 'WEEKLY',
          recurrenceDays: [3],
          recurrenceTime: '16:00',
          recurrenceUntil: '2030-05-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(4);
      expect(res.body.recurrenceGroupId).toBeTruthy();
    });

    it('professor só cria slots para si mesmo', async () => {
      const { school, teacher } = await seed();
      const res = await request(app)
        .post('/api/v1/appointments/slots')
        .set(authHeader({ id: teacher.id, schoolId: school.id, role: 'TEACHER' }))
        .send({ title: 'Meu Atendimento', startsAt: '2030-05-07T16:00:00.000Z' });

      expect(res.status).toBe(201);
      expect(res.body.staffId).toBe(teacher.id);
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app)
        .post('/api/v1/appointments/slots')
        .send({ title: 'X', startsAt: '2030-01-01T10:00:00Z' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/appointments/slots', () => {
    it('lista slots da escola', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      await request(app).post('/api/v1/appointments/slots').set(headers)
        .send({ title: 'Slot A', startsAt: '2030-05-01T10:00:00Z' });
      await request(app).post('/api/v1/appointments/slots').set(headers)
        .send({ title: 'Slot B', startsAt: '2030-05-02T10:00:00Z' });

      const res = await request(app).get('/api/v1/appointments/slots').set(headers);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('professor vê apenas seus próprios slots', async () => {
      const { school, admin, teacher } = await seed();

      await request(app).post('/api/v1/appointments/slots')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({ title: 'Do Admin', startsAt: '2030-05-01T10:00:00Z' });

      await request(app).post('/api/v1/appointments/slots')
        .set(authHeader({ id: teacher.id, schoolId: school.id, role: 'TEACHER' }))
        .send({ title: 'Do Professor', startsAt: '2030-05-02T10:00:00Z' });

      const res = await request(app).get('/api/v1/appointments/slots')
        .set(authHeader({ id: teacher.id, schoolId: school.id, role: 'TEACHER' }));

      expect(res.status).toBe(200);
      expect(res.body.every((s: { staffId: string }) => s.staffId === teacher.id)).toBe(true);
    });
  });

  describe('POST /api/v1/appointments/slots/:id/cancel', () => {
    it('cancela slot disponível', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      const slot = await request(app).post('/api/v1/appointments/slots').set(headers)
        .send({ title: 'X', startsAt: '2030-05-01T10:00:00Z' });

      const res = await request(app)
        .post(`/api/v1/appointments/slots/${slot.body.id}/cancel`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });
  });

  describe('POST /api/v1/appointments/slots/:id/cancel-group', () => {
    it('cancela somente este slot da série', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      const serie = await request(app).post('/api/v1/appointments/slots').set(headers).send({
        title: 'Série', startsAt: '2030-05-07T16:00:00Z',
        recurrenceType: 'WEEKLY', recurrenceDays: [3],
        recurrenceTime: '16:00', recurrenceUntil: '2030-05-31',
      });

      const firstSlotId = serie.body.slots[0].id;
      await request(app)
        .post(`/api/v1/appointments/slots/${firstSlotId}/cancel-group`)
        .set(headers).send({ mode: 'this' });

      const list = await request(app).get('/api/v1/appointments/slots').set(headers);
      const cancelled = list.body.filter((s: { status: string }) => s.status === 'CANCELLED');
      expect(cancelled).toHaveLength(1);
    });

    it('cancela este e os próximos', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      const serie = await request(app).post('/api/v1/appointments/slots').set(headers).send({
        title: 'Série', startsAt: '2030-05-07T16:00:00Z',
        recurrenceType: 'WEEKLY', recurrenceDays: [3],
        recurrenceTime: '16:00', recurrenceUntil: '2030-05-28',
      });

      // Cancela a partir do 2º slot (3 slots cancelados, 1 permanece)
      const secondSlotId = serie.body.slots[1].id;
      await request(app)
        .post(`/api/v1/appointments/slots/${secondSlotId}/cancel-group`)
        .set(headers).send({ mode: 'future' });

      const list = await request(app).get('/api/v1/appointments/slots').set(headers);
      const available  = list.body.filter((s: { status: string }) => s.status === 'AVAILABLE');
      const cancelled  = list.body.filter((s: { status: string }) => s.status === 'CANCELLED');
      expect(available).toHaveLength(1);
      expect(cancelled).toHaveLength(3);
    });
  });
});

describe('Appointments — Guardian', () => {
  async function seed() {
    const school   = await factory.school();
    const admin    = await factory.user(school.id, { role: 'ADMIN' });
    const klass    = await factory.class(school.id);
    const student  = await factory.student(school.id, klass.id);
    const guardian = await factory.guardian(school.id);
    await factory.linkGuardian(student.id, guardian.id, school.id);
    return { school, admin, klass, student, guardian };
  }

  async function createSlot(school: { id: string }, admin: { id: string }, overrides = {}) {
    return testPrisma.appointmentSlot.create({
      data: {
        schoolId: school.id,
        staffId: admin.id,
        title: 'Atendimento',
        startsAt: new Date('2030-05-07T16:00:00Z'),
        durationMin: 30,
        scope: 'ALL',
        status: 'AVAILABLE',
        ...overrides,
      },
    });
  }

  describe('GET /api/v1/appointments/available', () => {
    it('retorna slots disponíveis para o responsável', async () => {
      const { school, admin, guardian } = await seed();
      await createSlot(school, admin);

      const res = await request(app).get('/api/v1/appointments/available')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }));

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/appointments/book', () => {
    it('responsável reserva um slot', async () => {
      const { school, admin, student, guardian } = await seed();
      const slot = await createSlot(school, admin);

      const res = await request(app).post('/api/v1/appointments/book')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }))
        .send({ slotId: slot.id, studentId: student.id, notes: 'Quero falar sobre as notas' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('CONFIRMED');

      // Slot deve estar BOOKED
      const updated = await testPrisma.appointmentSlot.findUnique({ where: { id: slot.id } });
      expect(updated?.status).toBe('BOOKED');
    });

    it('não deixa reservar slot já reservado', async () => {
      const { school, admin, student, guardian } = await seed();
      const slot = await createSlot(school, admin);

      await request(app).post('/api/v1/appointments/book')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }))
        .send({ slotId: slot.id, studentId: student.id });

      const res2 = await request(app).post('/api/v1/appointments/book')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }))
        .send({ slotId: slot.id, studentId: student.id });

      expect(res2.status).toBe(404); // slot não está mais AVAILABLE
    });

    it('não deixa reservar com aluno não vinculado', async () => {
      const { school, admin, guardian } = await seed();
      const slot = await createSlot(school, admin);
      const outroStudent = await factory.student(school.id, (await factory.class(school.id)).id);

      const res = await request(app).post('/api/v1/appointments/book')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }))
        .send({ slotId: slot.id, studentId: outroStudent.id });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/appointments/my-bookings/:id/cancel', () => {
    it('responsável cancela próprio agendamento', async () => {
      const { school, admin, student, guardian } = await seed();
      const slot = await createSlot(school, admin);

      const booking = await request(app).post('/api/v1/appointments/book')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }))
        .send({ slotId: slot.id, studentId: student.id });

      const res = await request(app)
        .post(`/api/v1/appointments/my-bookings/${booking.body.id}/cancel`)
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }));

      expect(res.status).toBe(200);

      // Slot volta a estar disponível
      const updated = await testPrisma.appointmentSlot.findUnique({ where: { id: slot.id } });
      expect(updated?.status).toBe('AVAILABLE');
    });

    it('responsável não cancela agendamento de outro', async () => {
      const { school, admin, student, guardian } = await seed();
      const outroGuardian = await factory.guardian(school.id);
      const slot = await createSlot(school, admin);

      const booking = await request(app).post('/api/v1/appointments/book')
        .set(authHeader({ id: guardian.id, schoolId: school.id, role: 'GUARDIAN' }))
        .send({ slotId: slot.id, studentId: student.id });

      const res = await request(app)
        .post(`/api/v1/appointments/my-bookings/${booking.body.id}/cancel`)
        .set(authHeader({ id: outroGuardian.id, schoolId: school.id, role: 'GUARDIAN' }));

      expect(res.status).toBe(403);
    });
  });
});
