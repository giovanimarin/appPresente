import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { UserRole, PlanType } from '@prisma/client';
import { generateUploadUrl, generateDownloadUrl, buildStorageKey } from '../../config/storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { redis, redisKeys } from '../../config/redis';
import { sendWelcomeEmail } from '../../utils/mailer';
import type { RegisterSchoolDto, UpdateSchoolDto } from './schools.schemas';

export class SchoolsService {
  async register(dto: RegisterSchoolDto) {
    const existing = await prisma.user.findFirst({ where: { email: dto.adminEmail } });
    if (existing) {
      throw { status: 409, code: 'EMAIL_IN_USE', message: 'E-mail do administrador já cadastrado' };
    }

    // Senha temporária inutilizável — admin definirá a própria senha via link de primeiro acesso
    const placeholderHash = await bcrypt.hash(randomUUID(), 12);
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const school = await prisma.school.create({
      data: {
        name: dto.name,
        cnpj: dto.cnpj,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        phone: dto.phone,
        email: dto.email,
        plan: PlanType.STARTER,
        trialEndsAt,
        active: true,
        users: {
          create: {
            name: dto.adminName,
            email: dto.adminEmail,
            passwordHash: placeholderHash,
            role: UserRole.ADMIN,
            active: true,
          },
        },
      },
      include: {
        users: {
          where: { role: UserRole.ADMIN },
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const admin = school.users[0];

    // Gera token de primeiro acesso (TTL 72h)
    const token = randomUUID();
    await redis.set(redisKeys.firstAccess(token), admin.id, 'EX', 72 * 60 * 60);

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] ?? 'http://localhost:3000';
    const firstAccessUrl = `${frontendUrl}/primeiro-acesso?token=${token}`;

    try {
      await sendWelcomeEmail(dto.adminEmail, dto.adminName, dto.name, firstAccessUrl);
    } catch (e) {
      console.error('[schools] Falha ao enviar e-mail de boas-vindas:', e);
    }

    return { school, admin };
  }

  async getMe(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { units: { where: { active: true } } },
    });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };
    let logoDownloadUrl: string | null = null;
    if (school.logoUrl) {
      try { logoDownloadUrl = await generateDownloadUrl(school.logoUrl); } catch { /* storage unavailable */ }
    }
    return { ...school, logoDownloadUrl };
  }

  async requestLogoUpload(schoolId: string, filename: string, contentType: string) {
    const ext = extname(filename).toLowerCase() || '.jpg';
    const key = buildStorageKey(schoolId, 'logos', `${randomUUID()}${ext}`);
    const uploadUrl = await generateUploadUrl(key, contentType);
    return { uploadUrl, key };
  }

  async updateMe(schoolId: string, dto: UpdateSchoolDto) {
    return prisma.school.update({
      where: { id: schoolId },
      data: dto,
    });
  }

  async getStats(schoolId: string) {
    const [
      totalStudents,
      activeGuardians,
      pendingGuardians,
      totalComms,
      pendingForms,
      totalReads,
      totalCommsSent,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId, active: true } }),
      prisma.guardian.count({ where: { schoolId, active: true, activatedAt: { not: null } } }),
      prisma.guardian.count({ where: { schoolId, active: true, activatedAt: null } }),
      prisma.communication.count({ where: { schoolId, schoolStatus: 'SENT' } }),
      prisma.communication.count({ where: { schoolId, guardianStatus: { in: ['SENT', 'RECEIVED', 'UNDER_REVIEW'] } } }),
      prisma.communicationRead.count({
        where: { communication: { schoolId } },
      }),
      prisma.communication.count({ where: { schoolId, schoolStatus: 'SENT', requiresConfirmation: true } }),
    ]);

    const readRate = totalCommsSent > 0 ? Math.round((totalReads / totalCommsSent) * 100) : 0;

    return {
      totalStudents,
      activeGuardians,
      pendingGuardians,
      totalCommunicationsSent: totalComms,
      pendingForms,
      readRate,
    };
  }
}
