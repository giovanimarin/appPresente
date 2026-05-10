import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../test/app';
import { setupTestDb, clearDb, factory, testPrisma } from '../../../test/setup';
import { authHeader } from '../../../test/auth-helper';

beforeAll(async () => { await setupTestDb(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await testPrisma.$disconnect(); });

describe('Guardians — Staff CRUD', () => {
  async function seed() {
    const school = await factory.school();
    const admin  = await factory.user(school.id, { role: 'ADMIN' });
    return { school, admin };
  }

  describe('POST /api/v1/guardians', () => {
    it('cria responsável com CPF', async () => {
      const { school, admin } = await seed();
      const res = await request(app)
        .post('/api/v1/guardians')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({ name: 'Maria Silva', phone: '+5511999990001', cpf: '12345678901' });

      expect(res.status).toBe(201);
      expect(res.body.cpf).toBe('12345678901');
    });

    it('impede CPF duplicado', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      await request(app).post('/api/v1/guardians').set(headers)
        .send({ name: 'João', phone: '+5511999990001', cpf: '12345678901' });

      const res = await request(app).post('/api/v1/guardians').set(headers)
        .send({ name: 'Pedro', phone: '+5511999990002', cpf: '12345678901' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CPF_IN_USE');
    });

    it('impede telefone duplicado', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      await request(app).post('/api/v1/guardians').set(headers)
        .send({ name: 'João', phone: '+5511999990001' });

      const res = await request(app).post('/api/v1/guardians').set(headers)
        .send({ name: 'Pedro', phone: '+5511999990001' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PHONE_IN_USE');
    });

    it('cria responsável sem CPF (campo opcional)', async () => {
      const { school, admin } = await seed();
      const res = await request(app)
        .post('/api/v1/guardians')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({ name: 'Sem CPF', phone: '+5511999990099' });

      expect(res.status).toBe(201);
      expect(res.body.cpf).toBeNull();
    });

    it('retorna 400 sem telefone', async () => {
      const { school, admin } = await seed();
      const res = await request(app)
        .post('/api/v1/guardians')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({ name: 'Sem Telefone' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/guardians', () => {
    it('lista responsáveis da escola', async () => {
      const { school, admin } = await seed();
      await factory.guardian(school.id, { phone: '+5511000000001' });
      await factory.guardian(school.id, { phone: '+5511000000002' });

      const res = await request(app)
        .get('/api/v1/guardians')
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
    });

    it('professor vê apenas responsáveis de suas turmas', async () => {
      const { school } = await seed();
      const teacher = await factory.teacher(school.id);
      const klass   = await factory.class(school.id);

      // Vincula professor à turma
      await testPrisma.classTeacher.create({
        data: { classId: klass.id, teacherId: teacher.id, schoolId: school.id },
      });

      const student   = await factory.student(school.id, klass.id);
      const guardian1 = await factory.guardian(school.id, { phone: '+5511111110001' });
      const guardian2 = await factory.guardian(school.id, { phone: '+5511111110002' });
      await factory.linkGuardian(student.id, guardian1.id, school.id);
      // guardian2 não está vinculado a nenhuma turma do professor

      const res = await request(app)
        .get('/api/v1/guardians')
        .set(authHeader({ id: teacher.id, schoolId: school.id, role: 'TEACHER' }));

      expect(res.status).toBe(200);
      expect(res.body.data.map((g: { id: string }) => g.id)).toContain(guardian1.id);
      expect(res.body.data.map((g: { id: string }) => g.id)).not.toContain(guardian2.id);
    });
  });

  describe('DELETE /api/v1/guardians/:id/permanent', () => {
    it('bloqueia exclusão de responsável com aluno vinculado', async () => {
      const { school, admin } = await seed();
      const klass    = await factory.class(school.id);
      const student  = await factory.student(school.id, klass.id);
      const guardian = await factory.guardian(school.id);
      await factory.linkGuardian(student.id, guardian.id, school.id);

      const res = await request(app)
        .delete(`/api/v1/guardians/${guardian.id}/permanent`)
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('GUARDIAN_HAS_STUDENTS');
    });

    it('permite exclusão de responsável sem vínculos', async () => {
      const { school, admin } = await seed();
      const guardian = await factory.guardian(school.id);

      const res = await request(app)
        .delete(`/api/v1/guardians/${guardian.id}/permanent`)
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/guardians/:id', () => {
    it('atualiza CPF do responsável', async () => {
      const { school, admin } = await seed();
      const guardian = await factory.guardian(school.id);

      const res = await request(app)
        .put(`/api/v1/guardians/${guardian.id}`)
        .set(authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' }))
        .send({ cpf: '99988877766' });

      expect(res.status).toBe(200);
      expect(res.body.cpf).toBe('99988877766');
    });

    it('impede conflito de CPF na atualização', async () => {
      const { school, admin } = await seed();
      const headers = authHeader({ id: admin.id, schoolId: school.id, role: 'ADMIN' });

      const g1 = await factory.guardian(school.id, { phone: '+5511000000001', cpf: '11122233344' });
      const g2 = await factory.guardian(school.id, { phone: '+5511000000002' });

      const res = await request(app)
        .put(`/api/v1/guardians/${g2.id}`)
        .set(headers)
        .send({ cpf: g1.cpf });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CPF_IN_USE');
    });
  });
});
