import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { prisma } from '../../config/database';

const connection = { url: env.REDIS_URL };

interface ReminderJobData {
  communicationId: string;
}

export const reminderWorker = new Worker(
  'communication-reminders',
  async (job: Job<ReminderJobData>) => {
    const { communicationId } = job.data;

    const comm = await prisma.communication.findFirst({
      where: { id: communicationId, schoolStatus: 'SENT' },
      include: {
        commClasses: { select: { classId: true } },
        commStudents: { select: { studentId: true } },
        reads: { select: { guardianId: true } },
      },
    });

    if (!comm) {
      console.log(`[ReminderWorker] Comm ${communicationId} not found or not sent`);
      return;
    }

    // RN-10: Max 2 reminders per communication
    if (comm.reminderCount >= 2) {
      console.log(`[ReminderWorker] Comm ${communicationId} already sent 2 reminders`);
      return;
    }

    const readGuardianIds = new Set(comm.reads.map((r) => r.guardianId));

    // Find guardians who haven't read yet
    let unreadGuardians: { id: string; pushToken: string | null }[];

    if (comm.scope === 'CLASS') {
      const classIds = comm.commClasses.map((cc) => cc.classId);
      unreadGuardians = await prisma.guardian.findMany({
        where: {
          studentGuardians: {
            some: {
              status: 'ACTIVE',
              student: { classId: { in: classIds }, schoolId: comm.schoolId },
            },
          },
          pushToken: { not: null },
          id: { notIn: Array.from(readGuardianIds) },
        },
        select: { id: true, pushToken: true },
      });
    } else {
      const studentIds = comm.commStudents.map((cs) => cs.studentId);
      unreadGuardians = await prisma.guardian.findMany({
        where: {
          studentGuardians: {
            some: {
              status: 'ACTIVE',
              studentId: { in: studentIds },
            },
          },
          pushToken: { not: null },
          id: { notIn: Array.from(readGuardianIds) },
        },
        select: { id: true, pushToken: true },
      });
    }

    const tokens = unreadGuardians.map((g) => g.pushToken).filter(Boolean) as string[];

    if (tokens.length > 0) {
      console.log(`[ReminderWorker] Sending reminder to ${tokens.length} guardians for comm ${communicationId}`);
      // In production: send FCM to these tokens
      // await sendFcmNotifications(tokens, `Lembrete: ${comm.title}`, 'Você ainda não confirmou a leitura', {...})
    }

    // Increment reminder count
    await prisma.communication.update({
      where: { id: communicationId },
      data: { reminderCount: { increment: 1 } },
    });

    console.log(`[ReminderWorker] Reminder ${comm.reminderCount + 1}/2 sent for comm ${communicationId}`);
  },
  { connection, concurrency: 2 },
);

reminderWorker.on('completed', (job) => {
  console.log(`[ReminderWorker] Job ${job.id} completed`);
});

reminderWorker.on('failed', (job, err) => {
  console.error(`[ReminderWorker] Job ${job?.id} failed:`, err.message);
});
