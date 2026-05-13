import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: z.number().int().positive().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export type CreateRoomDto = z.infer<typeof createRoomSchema>;
export type UpdateRoomDto = z.infer<typeof updateRoomSchema>;
