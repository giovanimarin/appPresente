import { Response, NextFunction } from 'express';
import { UploadsService } from './uploads.service';
import type { AuthRequest } from '../../middlewares/auth';

const uploadsSvc = new UploadsService();

function handleError(err: unknown, res: Response, next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
  next(err);
}

export async function requestGuardianUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await uploadsSvc.requestGuardianUpload(req.user!.id, req.body);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function requestUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await uploadsSvc.requestUpload(req.user!.schoolId, req.user!.id, req.body);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function confirmUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const attachment = await uploadsSvc.confirmUpload(req.user!.schoolId, req.user!.id, req.body);
    res.status(201).json(attachment);
  } catch (err) { handleError(err, res, next); }
}

export async function getDownloadUrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await uploadsSvc.getDownloadUrl(req.user!.schoolId, req.params.id);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function deleteAttachment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await uploadsSvc.deleteAttachment(req.user!.schoolId, req.params.id, req.user!.id);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}
