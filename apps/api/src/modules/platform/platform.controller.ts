import { Response, NextFunction } from 'express';
import { PlatformService } from './platform.service';
import type { AuthRequest } from '../../middlewares/auth';

const svc = new PlatformService();

function handleError(err: unknown, res: Response, next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
  next(err);
}

export async function platformLogin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.login(req.body);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function getPlatformSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.getPlatformSummary());
  } catch (err) { next(err); }
}

export async function listSchools(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.listSchools(req.query as never));
  } catch (err) { handleError(err, res, next); }
}

export async function getSchoolHealth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.getSchoolHealth(req.params.id));
  } catch (err) { handleError(err, res, next); }
}

export async function updateSchool(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.updateSchool(req.params.id, req.user!.id, req.body));
  } catch (err) { handleError(err, res, next); }
}

export async function createSchool(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await svc.createSchool(req.body));
  } catch (err) { handleError(err, res, next); }
}

export async function getSchoolDirector(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.getSchoolDirector(req.params.id));
  } catch (err) { handleError(err, res, next); }
}

export async function resetDirectorPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.resetDirectorPassword(req.params.id, req.params.userId));
  } catch (err) { handleError(err, res, next); }
}

export async function archiveSchool(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.archiveSchool(req.params.id, req.user!.id));
  } catch (err) { handleError(err, res, next); }
}

export async function deleteSchool(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.deleteSchool(req.params.id));
  } catch (err) { handleError(err, res, next); }
}
