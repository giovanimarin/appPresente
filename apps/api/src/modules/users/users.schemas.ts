import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(200),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  role: z.enum(['SECRETARY', 'COORDINATOR', 'TEACHER']),
  phone: z.string().max(20).optional(),
  cpf: z.preprocess((v) => (v === '' ? undefined : v), z.string().length(11, 'CPF deve conter 11 dígitos')),
  unitId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.preprocess((v) => (v === '' ? undefined : v), z.string().max(20).optional()),
  cpf: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().length(11).optional()),
  role: z.enum(['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER']).optional(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  avatarUrl: z.string().url().optional(),
  unitId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
