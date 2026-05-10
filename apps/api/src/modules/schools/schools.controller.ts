import { Request, Response, NextFunction } from 'express';
import { SchoolsService } from './schools.service';
import type { AuthRequest } from '../../middlewares/auth';

const schoolsService = new SchoolsService();

export async function registerSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await schoolsService.register(req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function getSchoolMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const school = await schoolsService.getMe(req.user!.schoolId);
    res.json(school);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function updateSchoolMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const school = await schoolsService.updateMe(req.user!.schoolId, req.body);
    res.json(school);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function requestLogoUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filename, contentType } = req.body;
    const result = await schoolsService.requestLogoUpload(req.user!.schoolId, filename, contentType);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getSchoolStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await schoolsService.getStats(req.user!.schoolId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
