import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createUserSchema, updateUserSchema } from './users.schemas';
import {
  listUsers, getUser, createUser, updateUser,
  archiveUser, reactivateUser, deleteUserPermanent,
} from './users.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', listUsers);
router.post('/', validate(createUserSchema), createUser);
router.get('/:id', getUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.post('/:id/archive', archiveUser);
router.post('/:id/reactivate', reactivateUser);
router.delete('/:id/permanent', deleteUserPermanent);

export default router;
