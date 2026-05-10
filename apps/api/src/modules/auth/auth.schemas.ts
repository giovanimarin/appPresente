import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const otpSendSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export const otpVerifySchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d{6}$/),
});

export const guardianLoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const guardianSetPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

export const updateMeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200).optional(),
  email: z.string().email('E-mail inválido').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Nova senha deve ter ao menos 6 caracteres').optional(),
}).refine(
  (d) => !d.newPassword || !!d.currentPassword,
  { message: 'Informe a senha atual para definir uma nova', path: ['currentPassword'] },
);

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obrigatório'),
  userId: z.string().uuid('userId inválido'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type OtpSendDto = z.infer<typeof otpSendSchema>;
export type OtpVerifyDto = z.infer<typeof otpVerifySchema>;
export type GuardianLoginDto = z.infer<typeof guardianLoginSchema>;
export type GuardianSetPasswordDto = z.infer<typeof guardianSetPasswordSchema>;
export type { OtpSendDto as GuardianRequestOtpDto };
export type { OtpVerifyDto as GuardianVerifyOtpDto };
export type UpdateMeDto = z.infer<typeof updateMeSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
