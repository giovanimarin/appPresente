import { z } from 'zod';

export const createCommunicationSchema = z.object({
  schoolType: z.enum(['NOTICE', 'URGENT', 'INFORMATIVE', 'DOCUMENT', 'PHOTO', 'EXAM', 'MEETING']),
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  scope: z.enum(['CLASS', 'STUDENT']),
  targetIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um destino'),
  audienceFilter: z.enum(['ALL', 'LEGAL', 'FINANCIAL']).default('ALL'),
  requiresConfirmation: z.boolean().default(true),
  autoReminder: z.boolean().default(true),
  eventDate: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  sendNow: z.boolean().default(false),
  channels: z.array(z.enum(['notification', 'email'])).default(['notification']),
});

export const createGuardianCommunicationSchema = z.object({
  guardianType: z.enum(['ABSENCE', 'MEDICAL_CERT', 'EARLY_DEPARTURE']),
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  studentIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um aluno'),
  schoolId: z.string().uuid('schoolId inválido'),
});

export const guardianRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SENT', 'RECEIVED', 'UNDER_REVIEW', 'RESOLVED']).optional(),
  type: z.enum(['ABSENCE', 'MEDICAL_CERT', 'EARLY_DEPARTURE']).optional(),
});

export const updateGuardianStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'UNDER_REVIEW', 'RESOLVED']),
  note: z.string().optional(),
});

export const communicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED']).optional(),
  eventDateFrom: z.string().optional(),
  eventDateTo: z.string().optional(),
});

export type CreateCommunicationDto = z.infer<typeof createCommunicationSchema>;
export type CreateGuardianCommDto = z.infer<typeof createGuardianCommunicationSchema>;
export type CommunicationListQuery = z.infer<typeof communicationListQuerySchema>;
export type GuardianRequestListQuery = z.infer<typeof guardianRequestListQuerySchema>;
export type UpdateGuardianStatusDto = z.infer<typeof updateGuardianStatusSchema>;
