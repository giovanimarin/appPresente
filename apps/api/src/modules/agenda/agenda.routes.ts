import { Router } from 'express';
import { authenticate, requireGuardian, requireRoles, requireStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createEventSchema, updateEventSchema, eventListQuerySchema } from './agenda.schemas';
import {
  listEvents, createEvent, getEventById, updateEvent, cancelEvent, deleteEventPermanent, getGuardianEventFeed,
} from './agenda.controller';

const router = Router();

// ── Staff routes ──────────────────────────────────────────────────────────────
router.get('/', authenticate, requireStaff, validate(eventListQuerySchema, 'query'), listEvents);
router.post('/', authenticate, requireStaff, validate(createEventSchema), createEvent);
router.get('/:id', authenticate, requireStaff, getEventById);
router.put('/:id', authenticate, requireStaff, validate(updateEventSchema), updateEvent);
router.post('/:id/cancel', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR'), cancelEvent);
router.delete('/:id/permanent', authenticate, requireStaff, requireRoles('ADMIN'), deleteEventPermanent);

// ── Guardian routes ───────────────────────────────────────────────────────────
router.get('/guardian/feed', authenticate, requireGuardian, getGuardianEventFeed);

export default router;
