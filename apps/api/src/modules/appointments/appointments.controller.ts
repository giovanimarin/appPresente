import { Response, NextFunction } from 'express';
import { AppointmentsService } from './appointments.service';
import type { AuthRequest } from '../../middlewares/auth';

const svc = new AppointmentsService();

function handleErr(err: unknown, res: Response, next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
  next(err);
}

// ── Staff ─────────────────────────────────────────────────────────────────

export async function createSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await svc.createSlot(req.user!.schoolId, req.user!.id, req.body)); }
  catch (err) { handleErr(err, res, next); }
}

export async function listSlots(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to, staffId, status } = req.query as Record<string, string>;
    res.json(await svc.listSlots(req.user!.schoolId, req.user!.id, req.user!.role, { from, to, staffId, status }));
  } catch (err) { handleErr(err, res, next); }
}

export async function getSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getSlot(req.user!.schoolId, req.params.id)); }
  catch (err) { handleErr(err, res, next); }
}

export async function cancelSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.cancelSlot(req.user!.schoolId, req.params.id, req.user!.id, req.user!.role)); }
  catch (err) { handleErr(err, res, next); }
}

export async function cancelSlotGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const mode = (req.body?.mode ?? 'this') as 'this' | 'future' | 'all';
    res.json(await svc.cancelSlotGroup(req.user!.schoolId, req.params.id, req.user!.id, req.user!.role, mode));
  } catch (err) { handleErr(err, res, next); }
}

export async function deleteSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.deleteSlot(req.user!.schoolId, req.params.id, req.user!.id, req.user!.role)); }
  catch (err) { handleErr(err, res, next); }
}

export async function staffCancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.cancelBooking(req.user!.schoolId, req.params.bookingId, 'staff', req.user!.id, req.user!.role)); }
  catch (err) { handleErr(err, res, next); }
}

// ── Guardian ──────────────────────────────────────────────────────────────

export async function listAvailableSlots(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to, staffId } = req.query as Record<string, string>;
    res.json(await svc.listAvailableSlots(req.user!.schoolId, req.user!.id, { from, to, staffId }));
  } catch (err) { handleErr(err, res, next); }
}

export async function bookSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await svc.bookSlot(req.user!.schoolId, req.user!.id, req.body)); }
  catch (err) { handleErr(err, res, next); }
}

export async function cancelMyBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.cancelBooking(req.user!.schoolId, req.params.id, 'guardian', req.user!.id)); }
  catch (err) { handleErr(err, res, next); }
}

export async function listMyBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = req.query as Record<string, string>;
    res.json(await svc.listMyBookings(req.user!.id, { from, to }));
  } catch (err) { handleErr(err, res, next); }
}
