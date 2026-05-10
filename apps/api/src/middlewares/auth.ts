import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { UserRole } from '@presente/shared';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    schoolId: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido', code: 'UNAUTHORIZED' });
    return;
  }

  const token = header.slice(7);
  const payload = verifyJwt(token);

  if (!payload) {
    res.status(401).json({ error: 'Token inválido ou expirado', code: 'INVALID_TOKEN' });
    return;
  }

  req.user = {
    id: payload.sub,
    schoolId: payload.school_id,
    role: payload.role,
  };

  next();
}

export function requireRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado', code: 'UNAUTHORIZED' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissão para esta ação', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role === 'GUARDIAN') {
    res.status(403).json({ error: 'Acesso restrito a staff da escola', code: 'FORBIDDEN' });
    return;
  }
  next();
}

export function requireGuardian(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'GUARDIAN') {
    res.status(403).json({ error: 'Acesso restrito a responsáveis', code: 'FORBIDDEN' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Acesso restrito a administradores', code: 'FORBIDDEN' });
    return;
  }
  next();
}

export function requirePlatform(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'PLATFORM') {
    res.status(403).json({ error: 'Acesso restrito à plataforma', code: 'FORBIDDEN' });
    return;
  }
  next();
}
