import { Response, NextFunction } from 'express';
import { FormsService } from './forms.service';
import type { AuthRequest } from '../../middlewares/auth';

const formsSvc = new FormsService();

function handleError(err: unknown, res: Response, next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
  next(err);
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function listForms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await formsSvc.list(req.user!.schoolId, req.query as never);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function createForm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await formsSvc.create(req.user!.schoolId, req.user!.id, req.body);
    res.status(201).json(form);
  } catch (err) { handleError(err, res, next); }
}

export async function getFormById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await formsSvc.getById(req.user!.schoolId, req.params.id);
    res.json(form);
  } catch (err) { handleError(err, res, next); }
}

export async function updateForm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await formsSvc.update(req.user!.schoolId, req.params.id, req.body);
    res.json(form);
  } catch (err) { handleError(err, res, next); }
}

export async function listAllSubmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await formsSvc.listAllSubmissions(req.user!.schoolId, req.query as never);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function listSubmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await formsSvc.listSubmissions(req.user!.schoolId, req.params.id, req.query as never);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function resolveSubmission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await formsSvc.resolveSubmission(req.user!.schoolId, req.params.submissionId, req.user!.id, req.body.note);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

export async function deleteFormPermanent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await formsSvc.deletePermanent(req.user!.schoolId, req.params.id);
    res.json(result);
  } catch (err) { handleError(err, res, next); }
}

// ── Guardian ──────────────────────────────────────────────────────────────────

export async function getGuardianForms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const forms = await formsSvc.getGuardianForms(req.user!.id);
    res.json(forms);
  } catch (err) { handleError(err, res, next); }
}

export async function submitForm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const submission = await formsSvc.submit(req.user!.id, req.params.id, req.body);
    res.status(201).json(submission);
  } catch (err) { handleError(err, res, next); }
}

export async function getGuardianSubmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const submissions = await formsSvc.getGuardianSubmissions(req.user!.id);
    res.json(submissions);
  } catch (err) { handleError(err, res, next); }
}
