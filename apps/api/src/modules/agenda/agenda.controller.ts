import { Response, NextFunction } from 'express';
import { AgendaService } from './agenda.service';
import type { AuthRequest } from '../../middlewares/auth';

const agendaSvc = new AgendaService();

function handleError(err: unknown, res: Response, next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
  next(err);
}

export async function listEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await agendaSvc.list(req.user!.schoolId, req.user!.id, req.user!.role, req.query as never);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await agendaSvc.create(req.user!.schoolId, req.user!.id, req.user!.role, req.body);
    res.status(201).json(event);
  } catch (err) { handleError(err, res, next); }
}

export async function getEventById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await agendaSvc.getById(req.user!.schoolId, req.params.id);
    res.json(event);
  } catch (err) { handleError(err, res, next); }
}

export async function updateEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await agendaSvc.update(req.user!.schoolId, req.params.id, req.user!.id, req.user!.role, req.body);
    res.json(event);
  } catch (err) { handleError(err, res, next); }
}

export async function cancelEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await agendaSvc.cancel(req.user!.schoolId, req.params.id, req.user!.id);
    res.json(event);
  } catch (err) { handleError(err, res, next); }
}

export async function deleteEventPermanent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await agendaSvc.deletePermanent(req.user!.schoolId, req.params.id);
    res.json(event);
  } catch (err) { handleError(err, res, next); }
}

export async function getGuardianEventFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const events = await agendaSvc.getGuardianFeed(req.user!.id, req.user!.schoolId, days);
    res.json(events);
  } catch (err) { handleError(err, res, next); }
}
