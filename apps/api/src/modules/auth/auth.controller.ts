import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import type { AuthRequest } from '../../middlewares/auth';

const authService = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) {
      res.status(e.status).json({ error: e.message, code: e.code });
      return;
    }
    next(err);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.sendOtp(req.body);
    res.status(202).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) {
      res.status(e.status).json({ error: e.message, code: e.code });
      return;
    }
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) {
      res.status(e.status).json({ error: e.message, code: e.code });
      return;
    }
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refresh(req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) {
      res.status(e.status).json({ error: e.message, code: e.code });
      return;
    }
    next(err);
  }
}

export async function guardianLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.guardianLogin(req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function guardianSetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.guardianSetPassword(req.user!.id, req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await authService.logout(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.me(req.user!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.updateMe(req.user!.id, req.user!.schoolId, req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status) { res.status(e.status).json({ error: e.message, code: e.code }); return; }
    next(err);
  }
}
