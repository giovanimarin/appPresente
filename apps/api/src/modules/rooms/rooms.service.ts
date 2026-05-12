import { prisma } from '../../config/database';
import type { CreateRoomDto, UpdateRoomDto } from './rooms.schemas';

export class RoomsService {
  async listRooms(schoolId: string, includeInactive = false) {
    return prisma.room.findMany({
      where: { schoolId, ...(includeInactive ? {} : { active: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async getRoom(schoolId: string, id: string) {
    const room = await prisma.room.findFirst({ where: { id, schoolId } });
    if (!room) throw { status: 404, message: 'Sala não encontrada' };
    return room;
  }

  async createRoom(schoolId: string, dto: CreateRoomDto) {
    const duplicate = await prisma.room.findFirst({
      where: { schoolId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (duplicate) throw { status: 409, code: 'ROOM_DUPLICATE', message: 'Já existe uma sala com este nome' };

    return prisma.room.create({
      data: { ...dto, schoolId },
    });
  }

  async updateRoom(schoolId: string, id: string, dto: UpdateRoomDto) {
    await this.getRoom(schoolId, id);

    if (dto.name) {
      const duplicate = await prisma.room.findFirst({
        where: { schoolId, name: { equals: dto.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (duplicate) throw { status: 409, code: 'ROOM_DUPLICATE', message: 'Já existe uma sala com este nome' };
    }

    return prisma.room.update({ where: { id }, data: dto });
  }

  async setRoomActive(schoolId: string, id: string, active: boolean) {
    await this.getRoom(schoolId, id);
    return prisma.room.update({ where: { id }, data: { active } });
  }

  async deleteRoom(schoolId: string, id: string) {
    await this.getRoom(schoolId, id);
    const inUse = await prisma.class.findFirst({ where: { roomId: id } });
    if (inUse) throw { status: 409, code: 'ROOM_IN_USE', message: 'Sala está associada a uma ou mais turmas' };
    await prisma.room.delete({ where: { id } });
    return { success: true };
  }
}
