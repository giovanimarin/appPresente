import { z } from 'zod';

const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'DATE', 'FILE']),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // for SELECT
  placeholder: z.string().optional(),
});

export const createFormSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1, 'Formulário precisa de ao menos 1 campo'),
  expiresAt: z.string().datetime().optional(),
});

export const updateFormSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const submitFormSchema = z.object({
  studentId: z.string().uuid(),
  answers: z.record(z.unknown()),
});

export const resolveSubmissionSchema = z.object({
  note: z.string().optional(),
});

export const formListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export const submissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED']).optional(),
});

export type CreateFormDto = z.infer<typeof createFormSchema>;
export type UpdateFormDto = z.infer<typeof updateFormSchema>;
export type SubmitFormDto = z.infer<typeof submitFormSchema>;
export type FormListQuery = z.infer<typeof formListQuerySchema>;
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;
