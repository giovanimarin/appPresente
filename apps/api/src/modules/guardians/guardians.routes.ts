import { Router } from 'express';
import { authenticate, requireGuardian, requireRoles, requireStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  activateGuardianSchema, updateGuardianSchema, inviteGuardianSchema, staffUpdateGuardianSchema,
} from './guardians.schemas';
import {
  activateGuardian, getGuardianMe, updateGuardianMe, inviteGuardian,
  listPendingGuardians, resendGuardianInvite, approveGuardianLink,
  getMySchools, updateSchoolPreference,
  createGuardian, listAllGuardians, getGuardian, staffUpdateGuardian, archiveGuardian, reactivateGuardian, deleteGuardianPermanent,
} from './guardians.controller';

const router = Router();

// Rotas do responsável (GUARDIAN)
router.post('/activate', authenticate, requireGuardian, validate(activateGuardianSchema), activateGuardian);
router.get('/me', authenticate, requireGuardian, getGuardianMe);
router.put('/me', authenticate, requireGuardian, validate(updateGuardianSchema), updateGuardianMe);
router.post('/invite', authenticate, requireGuardian, validate(inviteGuardianSchema), inviteGuardian);
router.get('/my-schools', authenticate, requireGuardian, getMySchools);
router.put('/my-schools/:schoolId/preference', authenticate, requireGuardian, updateSchoolPreference);

// Rotas do staff (Admin/Secretary)
router.get('/', authenticate, requireStaff, listAllGuardians);
router.post('/', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), createGuardian);
router.get('/pending', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), listPendingGuardians);
router.get('/:id', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'), getGuardian);
router.put('/:id', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), validate(staffUpdateGuardianSchema), staffUpdateGuardian);
router.post('/:id/resend-invite', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), resendGuardianInvite);
router.post('/link/:token/approve', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), approveGuardianLink);
router.post('/:id/archive', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), archiveGuardian);
router.post('/:id/reactivate', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), reactivateGuardian);
router.delete('/:id/permanent', authenticate, requireStaff, requireRoles('ADMIN'), deleteGuardianPermanent);

export default router;
