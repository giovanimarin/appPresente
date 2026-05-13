import { Router } from 'express';
import { authenticate, requireStaff, requireRoles } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createRoomSchema, updateRoomSchema } from './rooms.schemas';
import {
  listRooms, getRoom, createRoom, updateRoom,
  deactivateRoom, reactivateRoom, deleteRoom,
} from './rooms.controller';

const router = Router();
router.use(authenticate, requireStaff);

router.get('/', listRooms);
router.post('/', requireRoles('ADMIN'), validate(createRoomSchema), createRoom);
router.get('/:id', getRoom);
router.put('/:id', requireRoles('ADMIN'), validate(updateRoomSchema), updateRoom);
router.post('/:id/deactivate', requireRoles('ADMIN'), deactivateRoom);
router.post('/:id/reactivate', requireRoles('ADMIN'), reactivateRoom);
router.delete('/:id', requireRoles('ADMIN'), deleteRoom);

export default router;
