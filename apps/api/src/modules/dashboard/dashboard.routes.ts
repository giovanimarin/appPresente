import { Router } from 'express';
import { authenticate, requireRoles, requireStaff } from '../../middlewares/auth';
import { getStats, getCommunicationReport, getEngagementReport } from './dashboard.controller';

const router = Router();

router.get('/stats', authenticate, requireStaff, getStats);
router.get('/reports/communications', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), getCommunicationReport);
router.get('/reports/engagement', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), getEngagementReport);

export default router;
