import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

interface RateLimitOptions {
  windowSeconds: number;
  max: number;
  keyPrefix: string;
  message?: string;
}

export function redisRateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier = req.ip ?? 'unknown';
    const key = `${options.keyPrefix}:${identifier}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, options.windowSeconds);
      }

      if (current > options.max) {
        res.status(429).json({
          error: options.message ?? 'Muitas tentativas. Tente novamente mais tarde.',
          code: 'RATE_LIMIT_EXCEEDED',
        });
        return;
      }

      next();
    } catch {
      // Se Redis falhar, deixa passar (fail open)
      next();
    }
  };
}

// Rate limit específico para OTP: 3 tentativas por telefone por hora
export function otpRateLimit(phone: string) {
  return async (): Promise<{ allowed: boolean; remaining: number }> => {
    const key = `otp_attempts:${phone}`;
    const max = 3;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 3600); // 1 hora
    }

    return {
      allowed: current <= max,
      remaining: Math.max(0, max - current),
    };
  };
}
