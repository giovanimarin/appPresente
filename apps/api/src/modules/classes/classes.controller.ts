import { Response, NextFunction } from 'express';
import { ClassesService } from './classes.service';
import { ImportService } from './import.service';
import type { AuthRequest } from '../../middlewares/auth';

const svc = new ClassesService();
const importSvc = new ImportService();

function handle(e: unknown, res: Response, next: NextFunction) {
  const err = e as { status?: number; code?: string; message?: string };
  if (err.status) { res.status(err.status).json({ error: err.message, code: err.code }); return; }
  next(e);
}

// ── Turmas ────────────────────────────────────────────────────────────────

export async function listClasses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, grade, shift, includeInactive } = req.query as Record<string, string>;
    const result = await svc.listClasses(req.user!.schoolId, req.user!.id, req.user!.role, { search, grade, shift, includeInactive: includeInactive === 'true' });
    res.json(result);
  } catch (e) { next(e); }
}

export async function getClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getClass(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

export async function createClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await svc.createClass(req.user!.schoolId, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function updateClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.updateClass(req.user!.schoolId, req.params.id, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function archiveClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.setClassActive(req.user!.schoolId, req.params.id, false)); }
  catch (e) { handle(e, res, next); }
}

export async function reactivateClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.setClassActive(req.user!.schoolId, req.params.id, true)); }
  catch (e) { handle(e, res, next); }
}

export async function deleteClassPermanent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.deleteClassPermanent(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

export async function getClassStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getClassStudents(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

// ── Alunos ────────────────────────────────────────────────────────────────

export async function listStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, classId, includeInactive } = req.query as Record<string, string>;
    res.json(await svc.listStudents(req.user!.schoolId, req.user!.id, req.user!.role, { search, classId, includeInactive: includeInactive === 'true' }));
  } catch (e) { next(e); }
}

export async function getStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getStudent(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

export async function createStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await svc.createStudent(req.user!.schoolId, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function updateStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.updateStudent(req.user!.schoolId, req.params.id, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function archiveStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.setStudentActive(req.user!.schoolId, req.params.id, false)); }
  catch (e) { handle(e, res, next); }
}

export async function reactivateStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.setStudentActive(req.user!.schoolId, req.params.id, true)); }
  catch (e) { handle(e, res, next); }
}

export async function deleteStudentPermanent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.deleteStudentPermanent(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

export async function getStudentGuardians(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getStudentGuardians(req.user!.schoolId, req.params.id)); }
  catch (e) { handle(e, res, next); }
}

export async function linkGuardianToStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await svc.linkGuardianToStudent(req.user!.schoolId, req.params.id, req.body)); }
  catch (e) { handle(e, res, next); }
}

export async function unlinkGuardianFromStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.unlinkGuardianFromStudent(req.user!.schoolId, req.params.id, req.params.guardianId)); }
  catch (e) { handle(e, res, next); }
}

// ── Professores da turma ──────────────────────────────────────────────────

export async function addClassTeacher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId, subject, isHomeroom } = req.body;
    res.status(201).json(await svc.addClassTeacher(req.user!.schoolId, req.params.id, teacherId, subject, isHomeroom));
  } catch (e) { handle(e, res, next); }
}

export async function removeClassTeacher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.removeClassTeacher(req.user!.schoolId, req.params.id, req.params.teacherId));
  } catch (e) { handle(e, res, next); }
}

export async function importStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await importSvc.importRows(req.user!.schoolId, req.body.rows)); }
  catch (e) { next(e); }
}
