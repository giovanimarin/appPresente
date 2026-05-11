import { Redis } from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

// Keys helpers
export const redisKeys = {
  refreshToken: (userId: string) => `refresh:${userId}`,
  otp: (phone: string) => `otp:${phone}`,
  otpAttempts: (phone: string) => `otp_attempts:${phone}`,
  rateLimit: (identifier: string) => `rate:${identifier}`,
  firstAccess: (token: string) => `first_access:${token}`,
  passwordReset: (token: string) => `pwd_reset:${token}`,
};
