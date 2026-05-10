import { Response, NextFunction } from 'express';
import { GuardiansService } from './guardians.service';
import type { AuthRequest } from '../../middlewares/auth';

const guardiansSvc = new GuardiansService();

export async function activateGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await guardiansSvc.activate(req.user!.id, req.user!.schoolId, req.body);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function getGuardianMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const guardian = await guardiansSvc.getMe(req.user!.id);
    res.json(guardian);
  } catch (err) { next(err); }
}

export async function updateGuardianMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const guardian = await guardiansSvc.updateMe(req.user!.id, req.body);
    res.json(guardian);
  } catch (err) { next(err); }
}

export async function inviteGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await guardiansSvc.invite(req.user!.id, req.user!.schoolId, req.body);
    res.status(202).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function listPendingGuardians(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const guardians = await guardiansSvc.listPending(req.user!.schoolId);
    res.json(guardians);
  } catch (err) { next(err); }
}

export async function resendGuardianInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await guardiansSvc.resendInvite(req.user!.schoolId, req.params.id);
    res.status(202).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function approveGuardianLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await guardiansSvc.approveLink(req.user!.schoolId, req.params.token, req.user!.id);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function createGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await guardiansSvc.create(req.user!.schoolId, req.body)); }
  catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function listAllGuardians(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, status, includeInactive } = req.query as Record<string, string>;
    res.json(await guardiansSvc.listAll(req.user!.schoolId, req.user!.id, req.user!.role, { search, status, includeInactive: includeInactive === 'true' }));
  } catch (err) { next(err); }
}

export async function getGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await guardiansSvc.getById(req.user!.schoolId, req.params.id)); }
  catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function staffUpdateGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await guardiansSvc.staffUpdate(req.user!.schoolId, req.params.id, req.body)); }
  catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function archiveGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await guardiansSvc.setGuardianActive(req.user!.schoolId, req.params.id, false)); }
  catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function reactivateGuardian(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await guardiansSvc.setGuardianActive(req.user!.schoolId, req.params.id, true)); }
  catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function deleteGuardianPermanent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await guardiansSvc.deleteGuardianPermanent(req.user!.schoolId, req.params.id)); }
  catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function getMySchools(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await guardiansSvc.getMySchools(req.user!.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updateSchoolPreference(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await guardiansSvc.updateSchoolPreference(req.user!.id, req.params.schoolId, req.body);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}
