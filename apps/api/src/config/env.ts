import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3001'), 10),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),

  DATABASE_URL: required('DATABASE_URL'),

  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '1h'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  AWS_REGION: optional('AWS_REGION', 'us-east-1'),
  AWS_ACCESS_KEY_ID: optional('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY'),
  AWS_S3_BUCKET: optional('AWS_S3_BUCKET', 'presente-local'),
  AWS_S3_ENDPOINT: optional('AWS_S3_ENDPOINT'),
  AWS_CLOUDFRONT_DOMAIN: optional('AWS_CLOUDFRONT_DOMAIN'),

  ZENVIA_API_KEY: optional('ZENVIA_API_KEY'),
  ZENVIA_SENDER: optional('ZENVIA_SENDER', 'Presente'),

  FIREBASE_PROJECT_ID: optional('FIREBASE_PROJECT_ID'),
  FIREBASE_PRIVATE_KEY: optional('FIREBASE_PRIVATE_KEY'),
  FIREBASE_CLIENT_EMAIL: optional('FIREBASE_CLIENT_EMAIL'),

  isDev: () => process.env.NODE_ENV !== 'production',
  isProd: () => process.env.NODE_ENV === 'production',
};
