import { Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import type { AuthRequest } from '../../middlewares/auth';

const usersService = new UsersService();

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const users = await usersService.list(req.user!.schoolId, includeInactive);
    res.json(users);
  } catch (err) { next(err); }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.get(req.user!.schoolId, req.params.id);
    res.json(user);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.create(req.user!.schoolId, req.body);
    res.status(201).json(user);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.update(req.user!.schoolId, req.params.id, req.body);
    res.json(user);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function archiveUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.setActive(req.user!.schoolId, req.params.id, req.user!.id, false);
    res.json(user);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function reactivateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.setActive(req.user!.schoolId, req.params.id, req.user!.id, true);
    res.json(user);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function deleteUserPermanent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.deletePermanent(req.user!.schoolId, req.params.id, req.user!.id);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}
