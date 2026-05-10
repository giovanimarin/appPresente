import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as otpUtils from '../../utils/otp';
import * as jwtUtils from '../../utils/jwt';

// ── generateOtp ───────────────────────────────────────────────────────────
describe('generateOtp()', () => {
  it('gera código com exatamente 6 dígitos', () => {
    const code = otpUtils.generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('gera códigos diferentes em chamadas distintas', () => {
    const codes = new Set(Array.from({ length: 20 }, () => otpUtils.generateOtp()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it('não gera código com menos de 6 dígitos', () => {
    for (let i = 0; i < 100; i++) {
      const code = otpUtils.generateOtp();
      expect(code.length).toBe(6);
    }
  });
});

// ── generateAccessToken / verifyJwt ───────────────────────────────────────
describe('JWT utils', () => {
  const payload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    school_id: '223e4567-e89b-12d3-a456-426614174001',
    role: 'ADMIN' as const,
  };

  it('gera token com payload correto', () => {
    const token = jwtUtils.generateAccessToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('verifica token válido e retorna payload', () => {
    const token = jwtUtils.generateAccessToken(payload);
    const decoded = jwtUtils.verifyJwt(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(payload.sub);
    expect(decoded?.school_id).toBe(payload.school_id);
    expect(decoded?.role).toBe(payload.role);
  });

  it('retorna null para token inválido', () => {
    const result = jwtUtils.verifyJwt('token.invalido.aqui');
    expect(result).toBeNull();
  });

  it('retorna null para token com assinatura incorreta', () => {
    const token = jwtUtils.generateAccessToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(jwtUtils.verifyJwt(tampered)).toBeNull();
  });

  it('payload contém iat e exp', () => {
    const token = jwtUtils.generateAccessToken(payload);
    const decoded = jwtUtils.verifyJwt(token);
    expect(decoded?.iat).toBeDefined();
    expect(decoded?.exp).toBeDefined();
    expect(decoded!.exp!).toBeGreaterThan(decoded!.iat!);
  });
});

// ── verifyOtp ─────────────────────────────────────────────────────────────
describe('verifyOtp()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retorna invalid quando código não encontrado no Redis', async () => {
    vi.spyOn(
      await import('../../config/redis').then((m) => m.redis),
      'get',
    ).mockResolvedValue(null);

    const result = await otpUtils.verifyOtp('+5511999999999', '123456');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('expirado');
  });

  it('retorna invalid quando código já utilizado', async () => {
    vi.spyOn(
      await import('../../config/redis').then((m) => m.redis),
      'get',
    ).mockResolvedValue(JSON.stringify({ code: '123456', used: true }));

    const result = await otpUtils.verifyOtp('+5511999999999', '123456');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('utilizado');
  });

  it('retorna invalid quando código incorreto', async () => {
    vi.spyOn(
      await import('../../config/redis').then((m) => m.redis),
      'get',
    ).mockResolvedValue(JSON.stringify({ code: '654321', used: false }));

    const result = await otpUtils.verifyOtp('+5511999999999', '123456');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('incorreto');
  });
});
