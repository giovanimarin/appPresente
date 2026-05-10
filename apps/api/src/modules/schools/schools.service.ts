import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { UserRole, PlanType } from '@prisma/client';
import { generateUploadUrl, generateDownloadUrl, buildStorageKey } from '../../config/storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { RegisterSchoolDto, UpdateSchoolDto } from './schools.schemas';

export class SchoolsService {
  async register(dto: RegisterSchoolDto) {
    // Verifica se e-mail do admin já existe
    const existing = await prisma.user.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existing) {
      throw { status: 409, code: 'EMAIL_IN_USE', message: 'E-mail do administrador já cadastrado' };
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
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
            passwordHash,
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

    return { school, admin: school.users[0] };
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
