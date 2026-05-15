import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { redisRateLimit } from '../../middlewares/rateLimit';
import { loginSchema, otpSendSchema, otpVerifySchema, refreshSchema, guardianLoginSchema, guardianSetPasswordSchema, updateMeSchema, firstAccessSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schemas';
import { login, sendOtp, verifyOtp, refresh, logout, me, updateMe, guardianLogin, guardianSetPassword, validateFirstAccessToken, completeFirstAccess, forgotPassword, resetPassword, validateGuardianFirstAccessToken, completeGuardianFirstAccess } from './auth.controller';

const router = Router();

// POST /auth/staff/login — Staff: email + senha → JWT
router.post(
  '/staff/login',
  redisRateLimit({ windowSeconds: 60, max: 10, keyPrefix: 'rl:login' }),
  validate(loginSchema),
  login,
);

// POST /auth/guardian/request-otp — Envia OTP por e-mail ao responsável
router.post(
  '/guardian/request-otp',
  redisRateLimit({ windowSeconds: 60, max: 5, keyPrefix: 'rl:otp_send' }),
  validate(otpSendSchema),
  sendOtp,
);

// POST /auth/guardian/verify-otp — Valida OTP → JWT do responsável
router.post(
  '/guardian/verify-otp',
  redisRateLimit({ windowSeconds: 60, max: 10, keyPrefix: 'rl:otp_verify' }),
  validate(otpVerifySchema),
  verifyOtp,
);

// POST /auth/guardian/login — Login com e-mail + senha
router.post(
  '/guardian/login',
  redisRateLimit({ windowSeconds: 60, max: 10, keyPrefix: 'rl:guardian_login' }),
  validate(guardianLoginSchema),
  guardianLogin,
);

// POST /auth/guardian/set-password — Definir/alterar senha (requer JWT)
router.post(
  '/guardian/set-password',
  authenticate,
  validate(guardianSetPasswordSchema),
  guardianSetPassword,
);

// POST /auth/staff/forgot-password — Envia e-mail de recuperação de senha
router.post(
  '/staff/forgot-password',
  redisRateLimit({ windowSeconds: 60, max: 5, keyPrefix: 'rl:forgot_pwd' }),
  validate(forgotPasswordSchema),
  forgotPassword,
);

// POST /auth/staff/reset-password — Redefine senha via token
router.post(
  '/staff/reset-password',
  redisRateLimit({ windowSeconds: 60, max: 10, keyPrefix: 'rl:reset_pwd' }),
  validate(resetPasswordSchema),
  resetPassword,
);

// GET  /auth/staff/first-access?token=xxx — Valida token de primeiro acesso
router.get('/staff/first-access', validateFirstAccessToken);

// POST /auth/staff/first-access — Define senha no primeiro acesso
router.post(
  '/staff/first-access',
  redisRateLimit({ windowSeconds: 60, max: 10, keyPrefix: 'rl:first_access' }),
  validate(firstAccessSchema),
  completeFirstAccess,
);

// GET  /auth/guardian/first-access?token=xxx — Valida token de primeiro acesso do responsável
router.get('/guardian/first-access', validateGuardianFirstAccessToken);

// POST /auth/guardian/first-access — Define senha no primeiro acesso do responsável
router.post(
  '/guardian/first-access',
  redisRateLimit({ windowSeconds: 60, max: 10, keyPrefix: 'rl:guardian_first_access' }),
  completeGuardianFirstAccess,
);

// POST /auth/refresh — Renova access token
router.post('/refresh', validate(refreshSchema), refresh);

// POST /auth/logout — Invalida refresh token
router.post('/logout', authenticate, logout);

// GET /auth/me — Perfil do usuário logado
router.get('/me', authenticate, me);

// PUT /auth/me — Atualiza nome, e-mail e/ou senha do próprio usuário
router.put('/me', authenticate, validate(updateMeSchema), updateMe);

export default router;
