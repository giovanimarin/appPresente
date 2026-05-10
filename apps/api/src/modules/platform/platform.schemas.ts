import { z } from 'zod';

export const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const schoolListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  plan: z.enum(['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE']).optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sort: z.enum(['name', 'createdAt', 'students', 'engagement']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const updateSchoolPlanSchema = z.object({
  plan: z.enum(['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE']).optional(),
  trialEndsAt: z.string().datetime().optional(),
  maxStudents: z.number().int().positive().optional(),
  billingEmail: z.string().email().optional(),
  platformNote: z.string().max(1000).optional(),
  active: z.boolean().optional(),
});

export const createSchoolSchema = z.object({
  // Dados da escola
  name: z.string().min(2).max(200),
  email: z.string().email(),
  cnpj: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  plan: z.enum(['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE']).default('STARTER'),
  trialDays: z.number().int().min(0).max(365).default(30),
  // Primeiro admin da escola (diretor/a)
  adminName: z.string().min(2).max(200),
  adminEmail: z.string().email(),
});

export type PlatformLoginDto = z.infer<typeof platformLoginSchema>;
export type SchoolListQuery = z.infer<typeof schoolListQuerySchema>;
export type UpdateSchoolPlanDto = z.infer<typeof updateSchoolPlanSchema>;
export type CreateSchoolDto = z.infer<typeof createSchoolSchema>;
