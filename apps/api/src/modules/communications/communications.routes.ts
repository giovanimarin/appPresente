import { Router } from 'express';
import { authenticate, requireGuardian, requireRoles, requireStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createCommunicationSchema,
  createGuardianCommunicationSchema,
  communicationListQuerySchema,
  guardianRequestListQuerySchema,
  updateGuardianStatusSchema,
} from './communications.schemas';
import {
  listCommunications, createCommunication, getCommunicationById,
  sendCommunication, resendCommunication, deliverCommunication, cancelCommunication, getReadReport,
  getGuardianNotifications, markNotificationRead,
  getGuardianFeed, trackReceived, trackViewed, confirmRead,
  createGuardianCommunication, resolveGuardianCommunication,
  getMyRequests, listGuardianRequests, updateGuardianRequestStatus,
} from './communications.controller';

const router = Router();

// ── Staff routes ──────────────────────────────────────────────────────────────
router.get('/', authenticate, requireStaff, validate(communicationListQuerySchema, 'query'), listCommunications);
router.get('/requests', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR'), validate(guardianRequestListQuerySchema, 'query'), listGuardianRequests);
router.patch('/requests/:id/status', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR'), validate(updateGuardianStatusSchema), updateGuardianRequestStatus);
router.post('/', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'), validate(createCommunicationSchema), createCommunication);
router.get('/:id', authenticate, requireStaff, getCommunicationById);
router.post('/:id/send', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'), sendCommunication);
router.post('/:id/resend', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'), resendCommunication);
router.post('/:id/deliver', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'), deliverCommunication);
router.post('/:id/cancel', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), cancelCommunication);
router.get('/:id/read-report', authenticate, requireStaff, getReadReport);
router.post('/:id/resolve', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR'), resolveGuardianCommunication);

// ── Guardian routes ───────────────────────────────────────────────────────────
router.get('/guardian/feed', authenticate, requireGuardian, getGuardianFeed);
router.get('/guardian/notifications', authenticate, requireGuardian, getGuardianNotifications);
router.post('/guardian/notifications/:commId/read', authenticate, requireGuardian, markNotificationRead);
router.get('/guardian/my-requests', authenticate, requireGuardian, getMyRequests);
router.post('/guardian', authenticate, requireGuardian, validate(createGuardianCommunicationSchema), createGuardianCommunication);
router.post('/:id/received', authenticate, requireGuardian, trackReceived);
router.post('/:id/viewed', authenticate, requireGuardian, trackViewed);
router.post('/:id/read', authenticate, requireGuardian, confirmRead);

export default router;
