import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Banco de teste isolado
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://presente:presente_dev_pass@localhost:5432/presente_test';

// Instância do Prisma para testes (aponta para banco de teste)
process.env.DATABASE_URL = TEST_DATABASE_URL;

export const testPrisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
  log: [],
});

// Roda as migrações uma vez antes de todos os testes do processo
export async function setupTestDb() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}

// Trunca todas as tabelas de dados entre testes (preserva estrutura)
export async function clearDb() {
  const tables = [
    'appointment_bookings',
    'appointment_slots',
    'form_submissions',
    'forms',
    'communication_reads',
    'communication_delivery_logs',
    'guardian_notifications',
    'communication_classes',
    'communication_students',
    'communications',
    'agenda_event_classes',
    'agenda_events',
    'student_guardians',
    'guardian_school_preferences',
    'students',
    'class_teachers',
    'coordinator_teachers',
    'classes',
    'guardians',
    'users',
    'school_units',
    'schools',
  ];

  await testPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(',')} RESTART IDENTITY CASCADE`,
  );
}

// Factories para criar dados de teste
export const factory = {
  async school(overrides: Record<string, unknown> = {}) {
    return testPrisma.school.create({
      data: {
        name: 'Escola Teste',
        email: `escola-${Date.now()}@test.com`,
        ...overrides,
      },
    });
  },

  async user(schoolId: string, overrides: Record<string, unknown> = {}) {
    const { hashPassword } = await import('../utils/password');
    return testPrisma.user.create({
      data: {
        schoolId,
        name: 'Usuário Teste',
        email: `user-${Date.now()}@test.com`,
        passwordHash: await hashPassword('Teste@2026'),
        role: 'ADMIN',
        ...overrides,
      },
    });
  },

  async teacher(schoolId: string, overrides: Record<string, unknown> = {}) {
    return factory.user(schoolId, { role: 'TEACHER', name: 'Prof. Teste', ...overrides });
  },

  async class(schoolId: string, overrides: Record<string, unknown> = {}) {
    return testPrisma.class.create({
      data: { schoolId, name: '1º Ano A', grade: '1º Ano', ...overrides },
    });
  },

  async student(schoolId: string, classId: string, overrides: Record<string, unknown> = {}) {
    return testPrisma.student.create({
      data: { schoolId, classId, name: 'Aluno Teste', ...overrides },
    });
  },

  async guardian(schoolId: string, overrides: Record<string, unknown> = {}) {
    return testPrisma.guardian.create({
      data: {
        schoolId,
        name: 'Responsável Teste',
        phone: `+5511${Date.now().toString().slice(-8)}`,
        ...overrides,
      },
    });
  },

  async linkGuardian(studentId: string, guardianId: string, schoolId: string) {
    return testPrisma.studentGuardian.create({
      data: {
        studentId,
        guardianId,
        schoolId,
        relationship: 'mae',
        isPrimary: true,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
  },
};
