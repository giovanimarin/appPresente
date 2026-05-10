import { redis, redisKeys } from '../config/redis';

const OTP_TTL_SECONDS = 10 * 60; // 10 minutos

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const key = redisKeys.otp(phone);
  await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify({ code, used: false }));
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ valid: boolean; reason?: string }> {
  const key = redisKeys.otp(phone);
  const raw = await redis.get(key);

  if (!raw) {
    return { valid: false, reason: 'Código expirado ou não encontrado' };
  }

  const stored = JSON.parse(raw) as { code: string; used: boolean };

  if (stored.used) {
    return { valid: false, reason: 'Código já utilizado' };
  }

  if (stored.code !== code) {
    return { valid: false, reason: 'Código incorreto' };
  }

  // Marcar como usado
  await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify({ code, used: true }));

  return { valid: true };
}

export async function checkOtpRateLimit(
  phone: string,
): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const key = redisKeys.otpAttempts(phone);
  const max = 3;
  const windowSeconds = 3600; // 1 hora

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (current > max) {
    const ttl = await redis.ttl(key);
    return { allowed: false, waitSeconds: ttl };
  }

  return { allowed: true };
}
