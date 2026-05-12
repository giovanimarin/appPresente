import { Response, NextFunction } from 'express';
import { RoomsService } from './rooms.service';
import type { AuthRequest } from '../../middlewares/auth';

const svc = new RoomsService();

function handle(e: unknown, res: Response, next: NextFunction) {
  const err = e as { status?: number; code?: string; message?: string };
  if (err.status) { res.status(err.status).json({ error: err.message, code: err.code }); return; }
  next(e);
}

export async function listRooms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    res.json(await svc.listRooms(req.user!.schoolId, includeInactive));
  } catch (e) { next(e); }
}

export async function getRoom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getRoom(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

export async function createRoom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await svc.createRoom(req.user!.schoolId, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function updateRoom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.updateRoom(req.user!.schoolId, req.params.id, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function deactivateRoom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.setRoomActive(req.user!.schoolId, req.params.id, false)); }
  catch (e) { handle(e, res, next); }
}

export async function reactivateRoom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.setRoomActive(req.user!.schoolId, req.params.id, true)); }
  catch (e) { handle(e, res, next); }
}

export async function deleteRoom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.deleteRoom(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}
