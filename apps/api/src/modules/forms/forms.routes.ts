import { Router } from 'express';
import { authenticate, requireGuardian, requireRoles, requireStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createFormSchema, updateFormSchema, submitFormSchema,
  formListQuerySchema, submissionListQuerySchema, allSubmissionsQuerySchema,
} from './forms.schemas';
import {
  listForms, createForm, getFormById, updateForm, deleteFormPermanent,
  listSubmissions, listAllSubmissions, resolveSubmission,
  getGuardianForms, submitForm, getGuardianSubmissions,
} from './forms.controller';

const router = Router();

// ── Guardian routes (must come before /:id to avoid shadowing) ────────────────
router.get('/guardian/available', authenticate, requireGuardian, getGuardianForms);
router.get('/guardian/submissions', authenticate, requireGuardian, getGuardianSubmissions);
router.post('/guardian/:id/submit', authenticate, requireGuardian, validate(submitFormSchema), submitForm);

// ── Staff routes ──────────────────────────────────────────────────────────────
router.get('/', authenticate, requireStaff, validate(formListQuerySchema, 'query'), listForms);
router.get('/submissions', authenticate, requireStaff, validate(allSubmissionsQuerySchema, 'query'), listAllSubmissions);
router.post('/', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), validate(createFormSchema), createForm);
router.get('/:id', authenticate, requireStaff, getFormById);
router.put('/:id', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY'), validate(updateFormSchema), updateForm);
router.delete('/:id/permanent', authenticate, requireStaff, requireRoles('ADMIN'), deleteFormPermanent);
router.get('/:id/submissions', authenticate, requireStaff, validate(submissionListQuerySchema, 'query'), listSubmissions);
router.post('/:id/submissions/:submissionId/resolve', authenticate, requireStaff, requireRoles('ADMIN', 'SECRETARY', 'COORDINATOR'), resolveSubmission);

export default router;
