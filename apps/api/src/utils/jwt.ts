import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis, redisKeys } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

// Role como string para compatibilidade entre Prisma enum e enum compartilhado
export interface TokenPayload {
  sub: string;
  school_id: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(): string {
  return uuidv4();
}

export function verifyJwt(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const ttlSeconds = 7 * 24 * 60 * 60; // 7 dias
  await redis.setex(redisKeys.refreshToken(userId), ttlSeconds, token);
}

export async function validateRefreshToken(userId: string, token: string): Promise<boolean> {
  const stored = await redis.get(redisKeys.refreshToken(userId));
  return stored === token;
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(redisKeys.refreshToken(userId));
}
