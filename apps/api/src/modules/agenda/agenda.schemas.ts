import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  eventType: z.enum(['EXAM', 'PARENT_MEETING', 'FIELD_TRIP', 'HOLIDAY', 'CULTURAL', 'OTHER']),
  subject: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  recurrence: z.enum(['NONE', 'WEEKLY', 'MONTHLY']).default('NONE'),
  classIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma turma'),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  classIds: z.array(z.string().uuid()).min(1).optional(),
});

export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  classId: z.string().uuid().optional(),
  eventType: z.enum(['EXAM', 'PARENT_MEETING', 'FIELD_TRIP', 'HOLIDAY', 'CULTURAL', 'OTHER']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateEventDto = z.infer<typeof createEventSchema>;
export type UpdateEventDto = z.infer<typeof updateEventSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
