import { Router } from 'express';
import { authenticate, requireGuardian, requireStaff } from '../../middlewares/auth';
import {
  createSlot, listSlots, getSlot, cancelSlot, cancelSlotGroup, deleteSlot, staffCancelBooking,
  listAvailableSlots, bookSlot, cancelMyBooking, listMyBookings,
} from './appointments.controller';

const router = Router();

// ── Staff (Admin / Secretary / Coordinator / Teacher) ────────────────────
router.get('/slots', authenticate, requireStaff, listSlots);
router.post('/slots', authenticate, requireStaff, createSlot);
router.get('/slots/:id', authenticate, requireStaff, getSlot);
router.post('/slots/:id/cancel', authenticate, requireStaff, cancelSlot);
router.post('/slots/:id/cancel-group', authenticate, requireStaff, cancelSlotGroup);
router.delete('/slots/:id', authenticate, requireStaff, deleteSlot);
router.post('/bookings/:bookingId/cancel', authenticate, requireStaff, staffCancelBooking);

// ── Guardian ──────────────────────────────────────────────────────────────
router.get('/available', authenticate, requireGuardian, listAvailableSlots);
router.post('/book', authenticate, requireGuardian, bookSlot);
router.get('/my-bookings', authenticate, requireGuardian, listMyBookings);
router.post('/my-bookings/:id/cancel', authenticate, requireGuardian, cancelMyBooking);

export default router;
