import { Router } from 'express';
import { authenticate, requireStaff, requireRoles } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createStudentSchema, updateStudentSchema } from './classes.schemas';
import {
  listStudents, getStudent, createStudent, updateStudent,
  archiveStudent, reactivateStudent, deleteStudentPermanent,
  getStudentGuardians, linkGuardianToStudent, unlinkGuardianFromStudent, importStudents,
} from './classes.controller';

const router = Router();
router.use(authenticate, requireStaff);

router.get('/', listStudents);
router.post('/', requireRoles('ADMIN', 'SECRETARY'), validate(createStudentSchema), createStudent);
router.post('/import', requireRoles('ADMIN', 'SECRETARY'), importStudents);
router.get('/:id', getStudent);
router.put('/:id', requireRoles('ADMIN', 'SECRETARY'), validate(updateStudentSchema), updateStudent);
router.post('/:id/archive', requireRoles('ADMIN', 'SECRETARY'), archiveStudent);
router.post('/:id/reactivate', requireRoles('ADMIN', 'SECRETARY'), reactivateStudent);
router.delete('/:id/permanent', requireRoles('ADMIN'), deleteStudentPermanent);
router.get('/:id/guardians', getStudentGuardians);
router.post('/:id/guardians', requireRoles('ADMIN', 'SECRETARY'), linkGuardianToStudent);
router.delete('/:id/guardians/:guardianId', requireRoles('ADMIN', 'SECRETARY'), unlinkGuardianFromStudent);

export default router;
