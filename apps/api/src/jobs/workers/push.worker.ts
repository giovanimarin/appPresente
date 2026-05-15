import { Worker, Job } from 'bullmq';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { env } from '../../config/env';
import { prisma } from '../../config/database';

const connection = { url: env.REDIS_URL };
const expo = new Expo();

interface CommPushJobData {
  communicationId: string;
  schoolId: string;
  scope: string;
  targetIds: string[];
  type: string;
}

interface EventPushJobData {
  eventId: string;
  schoolId: string;
  classIds: string[];
  type: string;
}

type PushJobData = CommPushJobData | EventPushJobData;

async function getGuardianTokensForClasses(classIds: string[], schoolId: string) {
  const sgs = await prisma.studentGuardian.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING_INVITE'] },
      student: { schoolId, classId: { in: classIds } },
      guardian: { pushToken: { not: null } },
    },
    select: { guardian: { select: { pushToken: true } } },
  });
  return sgs.map((sg) => sg.guardian.pushToken).filter((t): t is string => t !== null);
}

async function getGuardianTokensForStudents(studentIds: string[], schoolId: string) {
  const sgs = await prisma.studentGuardian.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING_INVITE'] },
      studentId: { in: studentIds },
      student: { schoolId },
      guardian: { pushToken: { not: null } },
    },
    select: { guardian: { select: { pushToken: true } } },
  });
  return sgs.map((sg) => sg.guardian.pushToken).filter((t): t is string => t !== null);
}

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
) {
  if (tokens.length === 0) return;

  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) {
    console.warn('[PushWorker] No valid Expo push tokens found');
    return;
  }

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === 'error') {
          console.error('[PushWorker] Receipt error:', receipt.message, receipt.details);
        }
      }
    } catch (err) {
      console.error('[PushWorker] Chunk send error:', err);
    }
  }

  console.log(`[PushWorker] Sent to ${validTokens.length} devices`);
}

export const pushWorker = new Worker<PushJobData>(
  'push-notifications',
  async (job: Job<PushJobData>) => {
    if ('eventId' in job.data) {
      const { eventId, schoolId, classIds, type } = job.data;
      const tokens = await getGuardianTokensForClasses(classIds, schoolId);
      if (tokens.length === 0) return;

      const title = type === 'EVENT_CANCELLED' ? 'Evento cancelado' : 'Novo evento na agenda';
      await sendPushNotifications(tokens, title, '', { type: 'AGENDA_EVENT', eventId });
      return;
    }

    const { communicationId, schoolId, scope, targetIds, type } = job.data;

    const comm = await prisma.communication.findFirst({
      where: { id: communicationId },
      select: { title: true, body: true },
    });

    if (!comm) {
      console.warn(`[PushWorker] Communication ${communicationId} not found`);
      return;
    }

    const tokens = scope === 'CLASS'
      ? await getGuardianTokensForClasses(targetIds, schoolId)
      : await getGuardianTokensForStudents(targetIds, schoolId);

    if (tokens.length === 0) return;

    const typeLabel: Record<string, string> = {
      URGENT: 'URGENTE', NOTICE: 'Aviso', INFORMATIVE: 'Informativo',
      DOCUMENT: 'Documento', PHOTO: 'Foto', EXAM: 'Prova', MEETING: 'Reunião',
    };
    const title = `${typeLabel[type] ?? type}: ${comm.title}`;

    await sendPushNotifications(tokens, title, comm.body.substring(0, 100), {
      type: 'COMMUNICATION',
      communicationId,
    });
  },
  { connection, concurrency: 5 },
);

pushWorker.on('completed', (job) => {
  console.log(`[PushWorker] Job ${job.id} completed`);
});

pushWorker.on('failed', (job, err) => {
  console.error(`[PushWorker] Job ${job?.id} failed:`, err.message);
});
