import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = { url: env.REDIS_URL };

export const pushQueue = new Queue('push-notifications', { connection });
export const smsQueue = new Queue('sms-messages', { connection });
export const reminderQueue = new Queue('communication-reminders', { connection });
export const emailQueue = new Queue('email-messages', { connection });

export const queueNames = {
  PUSH: 'push-notifications',
  SMS: 'sms-messages',
  REMINDER: 'communication-reminders',
  EMAIL: 'email-messages',
} as const;
