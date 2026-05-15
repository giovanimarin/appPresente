import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().min(1).max(100),
  grade: z.string().max(50).optional(),
  shift: z.enum(['MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL', 'manha', 'tarde', 'integral', 'noturno']).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  room: z.string().max(20).optional(),
  roomId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
});

export const updateClassSchema = createClassSchema.partial();

export const createStudentSchema = z.object({
  name: z.string().min(2).max(200),
  classId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid('classId inválido').optional()),
  enrollmentCode: z.string().max(50).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['masculino', 'feminino', 'outro', 'nao_informado']).optional(),
  notes: z.string().optional(),
  cpf: z.preprocess((v) => (v === '' ? undefined : v), z.string().length(11).optional()),
});

export const updateStudentSchema = createStudentSchema.partial().omit({ classId: true }).extend({
  classId: z.string().uuid().optional(),
});

export type CreateClassDto = z.infer<typeof createClassSchema>;
export type UpdateClassDto = z.infer<typeof updateClassSchema>;
export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
