import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { redis, redisKeys } from '../../config/redis';
import { sendWelcomeEmail } from '../../utils/mailer';
import type { CreateUserDto, UpdateUserDto } from './users.schemas';

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, avatarUrl: true, active: true,
  lastLoginAt: true, createdAt: true,
  unit: { select: { id: true, name: true } },
} as const;

export class UsersService {
  async list(schoolId: string, includeInactive = false) {
    const where = includeInactive ? { schoolId } : { schoolId, active: true };
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, select: USER_SELECT, orderBy: { name: 'asc' } }),
      prisma.user.count({ where }),
    ]);
    return { data, total };
  }

  async get(schoolId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, schoolId }, select: USER_SELECT });
    if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };
    return user;
  }

  async create(schoolId: string, dto: CreateUserDto) {
    const existing = await prisma.user.findFirst({ where: { email: dto.email, schoolId } });
    if (existing) {
      throw { status: 409, code: 'EMAIL_IN_USE', message: 'E-mail já cadastrado nesta escola' };
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : await bcrypt.hash(randomUUID(), 12);

    const user = await prisma.user.create({
      data: {
        schoolId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as 'SECRETARY' | 'COORDINATOR' | 'TEACHER',
        phone: dto.phone,
        unitId: dto.unitId,
        active: true,
      },
      select: { ...USER_SELECT, school: { select: { name: true } } },
    });

    if (!dto.password) {
      const token = randomUUID();
      await redis.set(redisKeys.firstAccess(token), user.id, 'EX', 72 * 60 * 60);
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] ?? 'http://localhost:3000';
      const firstAccessUrl = `${frontendUrl}/primeiro-acesso?token=${token}`;
      try {
        await sendWelcomeEmail(dto.email, dto.name, user.school.name, firstAccessUrl);
      } catch (e) {
        console.error('[users] Falha ao enviar e-mail de boas-vindas:', e);
      }
    }

    return user;
  }

  async update(schoolId: string, userId: string, dto: UpdateUserDto) {
    const user = await prisma.user.findFirst({ where: { id: userId, schoolId } });
    if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };

    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    return prisma.user.update({ where: { id: userId }, data, select: USER_SELECT });
  }

  async setActive(schoolId: string, userId: string, requesterId: string, active: boolean) {
    if (!active && userId === requesterId) {
      throw { status: 400, code: 'CANNOT_DEACTIVATE_SELF', message: 'Não é possível arquivar sua própria conta' };
    }
    const user = await prisma.user.findFirst({ where: { id: userId, schoolId } });
    if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };
    return prisma.user.update({ where: { id: userId }, data: { active }, select: { id: true, active: true } });
  }

  async deletePermanent(schoolId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw { status: 400, code: 'CANNOT_DELETE_SELF', message: 'Não é possível excluir sua própria conta' };
    }
    const user = await prisma.user.findFirst({ where: { id: userId, schoolId } });
    if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };

    const classCount = await prisma.classTeacher.count({ where: { teacherId: userId } });
    if (classCount > 0) {
      throw {
        status: 400,
        code: 'USER_HAS_CLASSES',
        message: `Este usuário está vinculado como professor em ${classCount} turma(s). Remova-o das turmas antes de excluir.`,
      };
    }

    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
