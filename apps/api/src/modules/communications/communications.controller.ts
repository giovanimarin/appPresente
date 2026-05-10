import { Response, NextFunction } from 'express';
import { CommunicationsService } from './communications.service';
import { prisma } from '../../config/database';
import type { AuthRequest } from '../../middlewares/auth';

const commSvc = new CommunicationsService();

function handleError(err: unknown, res: Response, next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
  next(err);
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function listCommunications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await commSvc.list(req.user!.schoolId, req.user!.id, req.user!.role, req.query as never);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function createCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comm = await commSvc.create(req.user!.schoolId, req.user!.id, req.user!.role, req.body);
    res.status(201).json(comm);
  } catch (err) { handleError(err, res, next); }
}

export async function getCommunicationById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comm = await commSvc.getById(req.user!.schoolId, req.params.id);
    res.json(comm);
  } catch (err) { handleError(err, res, next); }
}

export async function deliverCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await commSvc.deliver(req.user!.schoolId, req.params.id, req.user!.id, req.body);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function resendCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await commSvc.resend(req.user!.schoolId, req.params.id, req.user!.id);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function sendCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comm = await commSvc.send(req.user!.schoolId, req.params.id, req.user!.id);
    res.json(comm);
  } catch (err) { handleError(err, res, next); }
}

export async function cancelCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comm = await commSvc.cancel(req.user!.schoolId, req.params.id, req.user!.id);
    res.json(comm);
  } catch (err) { handleError(err, res, next); }
}

export async function getReadReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await commSvc.getReadReport(req.user!.schoolId, req.params.id);
    res.json(report);
  } catch (err) { handleError(err, res, next); }
}

// ── Guardian ──────────────────────────────────────────────────────────────────

export async function getGuardianNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await prisma.guardianNotification.findMany({
      where: { guardianId: req.user!.id },
      include: {
        communication: {
          select: { id: true, title: true, schoolType: true, body: true, sentAt: true, requiresConfirmation: true, school: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) { handleError(err, res, next); }
}

export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.guardianNotification.updateMany({
      where: { guardianId: req.user!.id, communicationId: req.params.commId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { handleError(err, res, next); }
}

export async function getGuardianFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filterSchoolId = typeof req.query.schoolId === 'string' ? req.query.schoolId : undefined;
    const feed = await commSvc.getGuardianFeed(req.user!.id, filterSchoolId);
    res.json(feed);
  } catch (err) { handleError(err, res, next); }
}

export async function trackReceived(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await commSvc.trackReceived(req.user!.id, req.params.id, req.body.studentId, req.body.deviceType ?? 'UNKNOWN');
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function trackViewed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? '';
    const result = await commSvc.trackViewed(req.user!.id, req.params.id, req.body.studentId, req.body.deviceType ?? 'UNKNOWN', ip);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function confirmRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? '';
    const result = await commSvc.confirmRead(
      req.user!.id,
      req.params.id,
      req.body.studentId,
      req.body.deviceType ?? 'UNKNOWN',
      ip,
    );
    res.status(201).json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function createGuardianCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comm = await commSvc.createGuardianComm(req.user!.id, req.body.schoolId, req.body);
    res.status(201).json(comm);
  } catch (err) { handleError(err, res, next); }
}

export async function getMyRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const requests = await commSvc.getMyRequests(req.user!.id);
    res.json(requests);
  } catch (err) { handleError(err, res, next); }
}

export async function listGuardianRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await commSvc.listGuardianRequests(req.user!.schoolId, req.query as never);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function updateGuardianRequestStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await commSvc.updateGuardianRequestStatus(req.user!.schoolId, req.params.id, req.user!.id, req.body);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

// ── Staff: Guardian comm resolution ──────────────────────────────────────────

export async function resolveGuardianCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comm = await commSvc.resolveGuardianComm(
      req.user!.schoolId,
      req.params.id,
      req.user!.id,
      req.body.note,
    );
    res.json(comm);
  } catch (err) { handleError(err, res, next); }
}
