import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, requireAdmin, requireRoles } from '../../middlewares/auth';
import { registerSchoolSchema, updateSchoolSchema } from './schools.schemas';
import {
  registerSchool,
  getSchoolMe,
  updateSchoolMe,
  requestLogoUpload,
  getSchoolStats,
} from './schools.controller';

const router = Router();

// POST /schools/register — público, cria escola + admin
router.post('/register', validate(registerSchoolSchema), registerSchool);

// GET /schools/me — dados da escola autenticada
router.get('/me', authenticate, getSchoolMe);

// PUT /schools/me — atualiza dados (só admin)
router.put('/me', authenticate, requireAdmin, validate(updateSchoolSchema), updateSchoolMe);

// POST /schools/me/request-logo-upload — gera URL pré-assinada para upload de logo
router.post('/me/request-logo-upload', authenticate, requireAdmin, requestLogoUpload);

// GET /schools/me/stats — dashboard stats
router.get(
  '/me/stats',
  authenticate,
  requireRoles('ADMIN', 'SECRETARY'),
  getSchoolStats,
);

export default router;
