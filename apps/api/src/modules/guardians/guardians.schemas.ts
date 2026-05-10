import { z } from 'zod';

export const activateGuardianSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(200).optional(),
  relationship: z.enum(['mae', 'pai', 'avo', 'avo_paterno', 'padrasto', 'madrasta', 'responsavel', 'outro']),
  studentId: z.string().uuid('studentId inválido'),
  pushToken: z.string().optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

export const updateGuardianSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().max(200).optional().nullable(),
  pushToken: z.string().optional().nullable(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const staffUpdateGuardianSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().max(200).optional().nullable(),
  cpf: z.string().length(11).regex(/^\d{11}$/, 'CPF deve conter 11 dígitos').optional().nullable(),
});

export type StaffUpdateGuardianDto = z.infer<typeof staffUpdateGuardianSchema>;

export const inviteGuardianSchema = z.object({
  phone: z.string().min(10).max(20),
  studentId: z.string().uuid(),
  relationship: z.enum(['mae', 'pai', 'avo', 'avo_paterno', 'padrasto', 'madrasta', 'responsavel', 'outro']),
});

export type ActivateGuardianDto = z.infer<typeof activateGuardianSchema>;
export type UpdateGuardianDto = z.infer<typeof updateGuardianSchema>;
export type InviteGuardianDto = z.infer<typeof inviteGuardianSchema>;
