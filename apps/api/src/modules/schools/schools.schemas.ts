import { z } from 'zod';

export const registerSchoolSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  cnpj: z.string().max(18).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'Estado deve ser a sigla com 2 letras').optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('E-mail inválido').max(200).optional(),
  // Admin que será criado junto com a escola
  adminName: z.string().min(2).max(200),
  adminEmail: z.string().email('E-mail inválido').max(200),
  adminPassword: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
});

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const updateSchoolSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  cnpj: z.preprocess(emptyToUndefined, z.string().max(18).optional()),
  address: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
  city: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  state: z.preprocess(emptyToUndefined, z.string().length(2).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
  email: z.preprocess(emptyToUndefined, z.string().email().max(200).optional()),
  logoUrl: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type RegisterSchoolDto = z.infer<typeof registerSchoolSchema>;
export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
