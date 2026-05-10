import { Router } from 'express';
import { authenticate, requireStaff, requireRoles } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createClassSchema, updateClassSchema } from './classes.schemas';
import {
  listClasses, getClass, createClass, updateClass,
  archiveClass, reactivateClass, deleteClassPermanent, getClassStudents,
  addClassTeacher, removeClassTeacher,
} from './classes.controller';

const router = Router();
router.use(authenticate, requireStaff);

router.get('/', listClasses);
router.post('/', requireRoles('ADMIN'), validate(createClassSchema), createClass);
router.get('/:id', getClass);
router.put('/:id', requireRoles('ADMIN'), validate(updateClassSchema), updateClass);
router.post('/:id/archive', requireRoles('ADMIN'), archiveClass);
router.post('/:id/reactivate', requireRoles('ADMIN'), reactivateClass);
router.delete('/:id/permanent', requireRoles('ADMIN'), deleteClassPermanent);
router.get('/:id/students', getClassStudents);
router.post('/:id/teachers', requireRoles('ADMIN', 'COORDINATOR'), addClassTeacher);
router.delete('/:id/teachers/:teacherId', requireRoles('ADMIN', 'COORDINATOR'), removeClassTeacher);

export default router;
