import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav',
] as const;

export const requestUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_MIME_TYPES as unknown as [string, ...string[]]),
  size: z.number().int().min(1).max(50 * 1024 * 1024), // 50 MB
  folder: z.enum(['communications', 'agenda', 'forms', 'avatars']),
  entityId: z.string().uuid().optional(), // comunicado / evento / formulário
});

export const confirmUploadSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().min(1),
  entityType: z.enum(['COMMUNICATION', 'AGENDA_EVENT', 'FORM']),
  entityId: z.string().uuid(),
});

export type RequestUploadDto = z.infer<typeof requestUploadSchema>;
export type ConfirmUploadDto = z.infer<typeof confirmUploadSchema>;
