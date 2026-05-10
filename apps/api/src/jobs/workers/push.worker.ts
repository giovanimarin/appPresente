import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { prisma } from '../../config/database';

const connection = { url: env.REDIS_URL };

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
      status: 'ACTIVE',
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
      status: 'ACTIVE',
      studentId: { in: studentIds },
      student: { schoolId },
      guardian: { pushToken: { not: null } },
    },
    select: { guardian: { select: { pushToken: true } } },
  });
  return sgs.map((sg) => sg.guardian.pushToken).filter((t): t is string => t !== null);
}

async function sendFcmNotifications(tokens: string[], title: string, body: string, data: Record<string, string>) {
  if (tokens.length === 0) return;
  // Production: use firebase-admin messaging.sendEachForMulticast({ tokens, notification: {title, body}, data })
  console.log(`[FCM] Sending to ${tokens.length} tokens:`, { title: title.substring(0, 50), data });
}

export const pushWorker = new Worker<PushJobData>(
  'push-notifications',
  async (job: Job<PushJobData>) => {
    // Distinguish job type by data shape
    if ('eventId' in job.data) {
      // Event push
      const { eventId, schoolId, classIds, type } = job.data;
      const tokens = await getGuardianTokensForClasses(classIds, schoolId);
      if (tokens.length === 0) return;

      const title = type === 'EVENT_CANCELLED'
        ? 'Evento cancelado'
        : 'Novo evento na agenda';

      await sendFcmNotifications(tokens, title, '', { type: 'AGENDA_EVENT', eventId });
      console.log(`[PushWorker] Event ${eventId} notified ${tokens.length} guardians`);
      return;
    }

    // Communication push
    const { communicationId, schoolId, scope, targetIds, type } = job.data;

    const comm = await prisma.communication.findFirst({
      where: { id: communicationId },
      select: { title: true, body: true },
    });

    if (!comm) {
      console.warn(`[PushWorker] Communication ${communicationId} not found`);
      return;
    }

    let tokens: string[];
    if (scope === 'CLASS') {
      tokens = await getGuardianTokensForClasses(targetIds, schoolId);
    } else {
      tokens = await getGuardianTokensForStudents(targetIds, schoolId);
    }

    if (tokens.length === 0) return;

    const typeLabel: Record<string, string> = {
      URGENT: 'URGENTE', NOTICE: 'Aviso', INFORMATIVE: 'Informativo',
      DOCUMENT: 'Documento', PHOTO: 'Foto', EXAM: 'Prova', MEETING: 'Reunião',
    };
    const title = `${typeLabel[type] ?? type}: ${comm.title}`;

    await sendFcmNotifications(tokens, title, comm.body.substring(0, 100), {
      type: 'COMMUNICATION',
      communicationId,
    });

    console.log(`[PushWorker] Comm ${communicationId} notified ${tokens.length} guardians`);
  },
  { connection, concurrency: 5 },
);

pushWorker.on('completed', (job) => {
  console.log(`[PushWorker] Job ${job.id} completed`);
});

pushWorker.on('failed', (job, err) => {
  console.error(`[PushWorker] Job ${job?.id} failed:`, err.message);
});
