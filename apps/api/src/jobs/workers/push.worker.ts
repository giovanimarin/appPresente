import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { sendPushToTokens } from '../../utils/push';

const connection = { url: env.REDIS_URL };

interface CommPushJobData {
  communicationId: string;
  schoolId: string;
  scope: string;
  targetIds: string[];
  type: string;
  audienceFilter?: string;
}

interface EventPushJobData {
  eventId: string;
  schoolId: string;
  classIds: string[];
  type: string;
}

type PushJobData = CommPushJobData | EventPushJobData;

function audienceWhere(audienceFilter?: string): Record<string, unknown> {
  if (audienceFilter === 'LEGAL') return { isLegalGuardian: true };
  if (audienceFilter === 'FINANCIAL') return { isFinancialGuardian: true };
  return {};
}

async function getGuardianTokensForClasses(classIds: string[], schoolId: string, audienceFilter?: string) {
  const sgs = await prisma.studentGuardian.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING_INVITE'] },
      student: { schoolId, classId: { in: classIds } },
      guardian: { pushToken: { not: null } },
      ...audienceWhere(audienceFilter),
    },
    select: { guardian: { select: { pushToken: true } } },
  });
  return sgs.map((sg) => sg.guardian.pushToken).filter((t): t is string => t !== null);
}

async function getGuardianTokensForStudents(studentIds: string[], schoolId: string, audienceFilter?: string) {
  const sgs = await prisma.studentGuardian.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING_INVITE'] },
      studentId: { in: studentIds },
      student: { schoolId },
      guardian: { pushToken: { not: null } },
      ...audienceWhere(audienceFilter),
    },
    select: { guardian: { select: { pushToken: true } } },
  });
  return sgs.map((sg) => sg.guardian.pushToken).filter((t): t is string => t !== null);
}


export const pushWorker = new Worker<PushJobData>(
  'push-notifications',
  async (job: Job<PushJobData>) => {
    if ('eventId' in job.data) {
      const { eventId, schoolId, classIds, type } = job.data;
      const tokens = await getGuardianTokensForClasses(classIds, schoolId);
      if (tokens.length === 0) return;

      const title = type === 'EVENT_CANCELLED' ? 'Evento cancelado' : 'Novo evento na agenda';
      await sendPushToTokens(tokens, title, '', { type: 'AGENDA_EVENT', eventId });
      return;
    }

    const { communicationId, schoolId, scope, targetIds, type, audienceFilter } = job.data;

    const comm = await prisma.communication.findFirst({
      where: { id: communicationId },
      select: { title: true, body: true },
    });

    if (!comm) {
      console.warn(`[PushWorker] Communication ${communicationId} not found`);
      return;
    }

    const tokens = scope === 'CLASS'
      ? await getGuardianTokensForClasses(targetIds, schoolId, audienceFilter)
      : await getGuardianTokensForStudents(targetIds, schoolId, audienceFilter);

    if (tokens.length === 0) return;

    const typeLabel: Record<string, string> = {
      URGENT: 'URGENTE', NOTICE: 'Aviso', INFORMATIVE: 'Informativo',
      DOCUMENT: 'Documento', PHOTO: 'Foto', EXAM: 'Prova', MEETING: 'Reunião',
    };
    const title = `${typeLabel[type] ?? type}: ${comm.title}`;

    await sendPushToTokens(tokens, title, comm.body.substring(0, 100), {
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
