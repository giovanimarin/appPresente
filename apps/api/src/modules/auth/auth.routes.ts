import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { redisRateLimit } from '../../middlewares/rateLimit';
import { loginSchema, otpSendSchema, otpVerifySchema, refreshSchema, guardianLoginSchema, guardianSetPasswordSchema, updateMeSchema } from './auth.schemas';
import { login, sendOtp, verifyOtp, refresh, logout, me, updateMe, guardianLogin, guardianSetPassword } from './auth.controller';

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

// POST /auth/refresh — Renova access token
router.post('/refresh', validate(refreshSchema), refresh);

// POST /auth/logout — Invalida refresh token
router.post('/logout', authenticate, logout);

// GET /auth/me — Perfil do usuário logado
router.get('/me', authenticate, me);

// PUT /auth/me — Atualiza nome, e-mail e/ou senha do próprio usuário
router.put('/me', authenticate, validate(updateMeSchema), updateMe);

export default router;
