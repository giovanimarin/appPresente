import { Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import type { AuthRequest } from '../../middlewares/auth';

const dashboardSvc = new DashboardService();

export async function getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await dashboardSvc.getSchoolStats(req.user!.schoolId);
    res.json(stats);
  } catch (err) { next(err); }
}

export async function getCommunicationReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const report = await dashboardSvc.getCommunicationReport(req.user!.schoolId, from, to);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getEngagementReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await dashboardSvc.getEngagementByGuardian(req.user!.schoolId);
    res.json(report);
  } catch (err) { next(err); }
}
