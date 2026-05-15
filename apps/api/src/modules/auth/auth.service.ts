import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from '../../utils/jwt';
import { generateOtp, storeOtp, verifyOtp, checkOtpRateLimit } from '../../utils/otp';
import { sendOtpEmail, sendPasswordResetEmail } from '../../utils/mailer';
import { redis, redisKeys } from '../../config/redis';
import type { LoginDto, OtpSendDto, OtpVerifyDto, RefreshDto, GuardianLoginDto, GuardianSetPasswordDto, UpdateMeDto, FirstAccessDto, ForgotPasswordDto, ResetPasswordDto } from './auth.schemas';

export class AuthService {
  // ── Staff: Login com email + senha ────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        active: true,
      },
      include: { school: { select: { id: true, name: true, active: true } } },
    });

    if (!user) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' };
    }

    if (!user.school.active) {
      throw { status: 403, code: 'SCHOOL_INACTIVE', message: 'Escola desativada' };
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' };
    }

    const accessToken = generateAccessToken({
      sub: user.id,
      school_id: user.schoolId,
      role: user.role, // string compatível com TokenPayload
    });
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    // Atualiza last_login_at
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        school: user.school,
      },
    };
  }

  // ── Guardian: Login com e-mail + senha ───────────────────────────────────

  async guardianLogin(dto: GuardianLoginDto) {
    // Prefer the guardian record that actually has a password set
    const guardian =
      (await prisma.guardian.findFirst({
        where: { email: dto.email, active: true, passwordHash: { not: null } },
        orderBy: { activatedAt: 'desc' },
      })) ??
      (await prisma.guardian.findFirst({
        where: { email: dto.email, active: true },
      }));

    if (!guardian) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' };
    }

    if (!guardian.passwordHash) {
      throw { status: 400, code: 'NO_PASSWORD', message: 'Você ainda não definiu uma senha. Use o código por e-mail para entrar.' };
    }

    const match = await bcrypt.compare(dto.password, guardian.passwordHash);
    if (!match) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' };
    }

    await prisma.guardian.update({
      where: { id: guardian.id },
      data: { lastSeenAt: new Date() },
    });

    const accessToken = generateAccessToken({ sub: guardian.id, school_id: guardian.schoolId, role: 'GUARDIAN' });
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(guardian.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      guardian: { id: guardian.id, name: guardian.name, email: guardian.email, phone: guardian.phone, schoolId: guardian.schoolId },
    };
  }

  // ── Guardian: Definir/alterar senha ──────────────────────────────────────

  async guardianSetPassword(guardianId: string, dto: GuardianSetPasswordDto) {
    const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian) throw { status: 404, code: 'NOT_FOUND', message: 'Responsável não encontrado' };

    if (guardian.passwordHash) {
      if (!dto.currentPassword) {
        throw { status: 400, code: 'CURRENT_PASSWORD_REQUIRED', message: 'Informe a senha atual' };
      }
      const match = await bcrypt.compare(dto.currentPassword, guardian.passwordHash);
      if (!match) {
        throw { status: 401, code: 'INVALID_PASSWORD', message: 'Senha atual incorreta' };
      }
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await prisma.guardian.update({ where: { id: guardianId }, data: { passwordHash: hash } });
    return { ok: true };
  }

  // ── OTP: Enviar código por e-mail ao responsável ─────────────────────────

  async sendOtp(dto: OtpSendDto) {
    // Verifica se existe guardian com esse e-mail
    const guardian = await prisma.guardian.findFirst({
      where: { email: dto.email },
    });

    if (!guardian) {
      // Não revela se o e-mail existe ou não (segurança)
      return { message: 'Se o e-mail estiver cadastrado, você receberá um código em breve.' };
    }

    // Rate limit: 3 tentativas por e-mail por hora
    const rateCheck = await checkOtpRateLimit(dto.email);
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        code: 'OTP_RATE_LIMIT',
        message: `Muitas tentativas. Aguarde ${Math.ceil((rateCheck.waitSeconds ?? 3600) / 60)} minutos.`,
      };
    }

    const code = generateOtp();
    await storeOtp(dto.email, code);
    await sendOtpEmail(dto.email, code);

    return { message: 'Se o e-mail estiver cadastrado, você receberá um código em breve.' };
  }

  // ── OTP: Verificar código e retornar JWT do responsável ──────────────────

  async verifyOtp(dto: OtpVerifyDto) {
    const result = await verifyOtp(dto.email, dto.code);
    if (!result.valid) {
      throw { status: 401, code: 'INVALID_OTP', message: result.reason };
    }

    // Prefer the guardian with students linked; fall back to any guardian with that email
    const guardian =
      (await prisma.guardian.findFirst({
        where: { email: dto.email, studentGuardians: { some: {} } },
        orderBy: { activatedAt: 'desc' },
        include: {
          studentGuardians: {
            where: { status: 'ACTIVE' },
            include: { student: { select: { id: true, name: true, classId: true } } },
          },
        },
      })) ??
      (await prisma.guardian.findFirst({
        where: { email: dto.email },
        include: {
          studentGuardians: {
            where: { status: 'ACTIVE' },
            include: { student: { select: { id: true, name: true, classId: true } } },
          },
        },
      }));

    if (!guardian) {
      throw { status: 404, code: 'GUARDIAN_NOT_FOUND', message: 'Responsável não encontrado' };
    }

    const isFirstAccess = !guardian.activatedAt;

    // Primeiro acesso: marca como ativado
    await prisma.guardian.update({
      where: { id: guardian.id },
      data: {
        lastSeenAt: new Date(),
        ...(isFirstAccess ? { activatedAt: new Date() } : {}),
      },
    });

    const accessToken = generateAccessToken({
      sub: guardian.id,
      school_id: guardian.schoolId,
      role: 'GUARDIAN',
    });
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(guardian.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      guardian: {
        id: guardian.id,
        name: guardian.name,
        email: guardian.email,
        phone: guardian.phone,
        schoolId: guardian.schoolId,
      },
      students: guardian.studentGuardians.map((sg) => sg.student),
      isFirstAccess,
    };
  }

  // ── Refresh Token ─────────────────────────────────────────────────────────

  async refresh(dto: RefreshDto) {
    const valid = await validateRefreshToken(dto.userId, dto.refreshToken);
    if (!valid) {
      throw { status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido' };
    }

    const user = await prisma.user.findUnique({
      where: { id: dto.userId, active: true },
    });

    if (!user) {
      throw { status: 401, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };
    }

    const newAccessToken = generateAccessToken({
      sub: user.id,
      school_id: user.schoolId,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string) {
    await revokeRefreshToken(userId);
    return { message: 'Logout realizado com sucesso' };
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  async me(payload: { id: string; schoolId: string; role: string }) {
    if (payload.role === 'GUARDIAN') {
      const guardian = await prisma.guardian.findUnique({
        where: { id: payload.id },
        select: { id: true, name: true, email: true, phone: true, schoolId: true, avatarUrl: true },
      });
      return { user: guardian, role: 'GUARDIAN' };
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id, active: true },
      select: { id: true, name: true, email: true, role: true, schoolId: true, avatarUrl: true },
    });
    return { user, role: user?.role };
  }

  // ── Atualizar próprio perfil (staff) ─────────────────────────────────────

  async updateMe(userId: string, schoolId: string, dto: UpdateMeDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, code: 'NOT_FOUND', message: 'Usuário não encontrado' };

    if (dto.email && dto.email !== user.email) {
      const conflict = await prisma.user.findFirst({
        where: { email: dto.email, schoolId, id: { not: userId } },
      });
      if (conflict) throw { status: 409, code: 'EMAIL_IN_USE', message: 'E-mail já está em uso' };
    }

    if (dto.newPassword) {
      const match = await bcrypt.compare(dto.currentPassword!, user.passwordHash);
      if (!match) throw { status: 401, code: 'INVALID_PASSWORD', message: 'Senha atual incorreta' };
    }

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.newPassword) data.passwordHash = await bcrypt.hash(dto.newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, schoolId: true },
    });

    return { user: updated };
  }

  // ── Recuperação de Senha ──────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await prisma.user.findFirst({ where: { email: dto.email, active: true } });
    // Não revela se o e-mail existe ou não
    if (!user) return { message: 'Se o e-mail estiver cadastrado, você receberá um link em breve.' };

    const token = randomUUID();
    await redis.set(redisKeys.passwordReset(token), user.id, 'EX', 60 * 60);

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/redefinir-senha?token=${token}`;

    try {
      await sendPasswordResetEmail(dto.email, user.name, resetUrl);
    } catch (e) {
      console.error('[auth] Falha ao enviar e-mail de recuperação:', e);
    }

    return { message: 'Se o e-mail estiver cadastrado, você receberá um link em breve.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await redis.get(redisKeys.passwordReset(dto.token));
    if (!userId) {
      throw { status: 400, code: 'INVALID_TOKEN', message: 'Link inválido ou expirado' };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await redis.del(redisKeys.passwordReset(dto.token));

    return { ok: true, message: 'Senha redefinida com sucesso. Faça login para continuar.' };
  }

  // ── Primeiro Acesso ───────────────────────────────────────────────────────

  async validateFirstAccessToken(token: string) {
    const userId = await redis.get(redisKeys.firstAccess(token));
    if (!userId) {
      throw { status: 400, code: 'INVALID_TOKEN', message: 'Link inválido ou expirado' };
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };
    }
    return { valid: true, user };
  }

  async completeFirstAccess(dto: FirstAccessDto) {
    const userId = await redis.get(redisKeys.firstAccess(dto.token));
    if (!userId) {
      throw { status: 400, code: 'INVALID_TOKEN', message: 'Link inválido ou expirado' };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await redis.del(redisKeys.firstAccess(dto.token));

    return { ok: true, message: 'Senha definida com sucesso. Faça login para continuar.' };
  }

  // ── Primeiro Acesso do Responsável ───────────────────────────────────────

  async validateGuardianFirstAccessToken(token: string) {
    const guardianId = await redis.get(redisKeys.guardianFirstAccess(token));
    if (!guardianId) throw { status: 400, code: 'INVALID_TOKEN', message: 'Link inválido ou expirado' };
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: { id: true, name: true, email: true },
    });
    if (!guardian) throw { status: 404, code: 'NOT_FOUND', message: 'Responsável não encontrado' };
    return { valid: true, guardian };
  }

  async completeGuardianFirstAccess(token: string, password: string) {
    const guardianId = await redis.get(redisKeys.guardianFirstAccess(token));
    if (!guardianId) throw { status: 400, code: 'INVALID_TOKEN', message: 'Link inválido ou expirado' };

    const hash = await bcrypt.hash(password, 10);
    await prisma.guardian.update({
      where: { id: guardianId },
      data: { passwordHash: hash, activatedAt: new Date() },
    });
    await redis.del(redisKeys.guardianFirstAccess(token));

    return { ok: true, message: 'Senha definida com sucesso. Faça login para continuar.' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async _getSchoolIdByPhone(phone: string): Promise<string> {
    // Busca a escola pelo telefone do guardian em student_guardians
    const existing = await prisma.studentGuardian.findFirst({
      where: {
        guardian: { phone },
      },
      include: { guardian: true },
    });

    if (existing) return existing.guardian.schoolId;

    // Fallback: primeira escola ativa
    const school = await prisma.school.findFirst({ where: { active: true } });
    if (!school) throw { status: 404, code: 'SCHOOL_NOT_FOUND', message: 'Escola não encontrada' };
    return school.id;
  }
}
