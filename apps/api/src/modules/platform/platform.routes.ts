import { Router } from 'express';
import { authenticate, requirePlatform } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { platformLoginSchema, schoolListQuerySchema, updateSchoolPlanSchema, createSchoolSchema } from './platform.schemas';
import {
  platformLogin, getPlatformSummary, listSchools, getSchoolHealth, updateSchool, createSchool,
  getSchoolDirector, resetDirectorPassword, archiveSchool, deleteSchool,
} from './platform.controller';

const router = Router();

// Público: login da plataforma
router.post('/auth/login', validate(platformLoginSchema), platformLogin);

// Protegido: apenas PLATFORM
router.get('/summary', authenticate, requirePlatform, getPlatformSummary);
router.get('/schools', authenticate, requirePlatform, validate(schoolListQuerySchema, 'query'), listSchools);
router.post('/schools', authenticate, requirePlatform, validate(createSchoolSchema), createSchool);
router.get('/schools/:id', authenticate, requirePlatform, getSchoolHealth);
router.patch('/schools/:id', authenticate, requirePlatform, validate(updateSchoolPlanSchema), updateSchool);
router.post('/schools/:id/archive', authenticate, requirePlatform, archiveSchool);
router.delete('/schools/:id', authenticate, requirePlatform, deleteSchool);
router.get('/schools/:id/director', authenticate, requirePlatform, getSchoolDirector);
router.post('/schools/:id/director/:userId/reset-password', authenticate, requirePlatform, resetDirectorPassword);

export default router;
