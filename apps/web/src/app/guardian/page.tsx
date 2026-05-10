'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setTokens, setUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

type Tab = 'password' | 'otp';

export default function GuardianLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('password');

  // Shared
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP flow
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpCode, setOtpCode] = useState('');

  function clearError() { setError(''); }

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const res = await authApi.guardianLogin(email, password);
      const { accessToken, refreshToken, guardian } = res.data;
      setTokens(accessToken, refreshToken);
      setUser({ id: guardian.id, schoolId: guardian.schoolId, role: 'GUARDIAN', name: guardian.name });
      router.push('/guardian/feed');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; code?: string } } };
      const code = e.response?.data?.code;
      if (code === 'NO_PASSWORD') {
        setError('Você ainda não definiu uma senha. Use a aba "Código por e-mail" para entrar e depois configure uma senha no seu perfil.');
      } else {
        setError(e.response?.data?.error ?? 'E-mail ou senha inválidos');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      await authApi.requestOtp(email);
      setOtpStep('code');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const res = await authApi.verifyOtp(email, otpCode);
      const { accessToken, refreshToken, guardian } = res.data;
      setTokens(accessToken, refreshToken);
      setUser({ id: guardian.id, schoolId: guardian.schoolId, role: 'GUARDIAN', name: guardian.name });
      router.push('/guardian/feed');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Código inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
    setOtpStep('email');
    setOtpCode('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Presente</h1>
            <p className="text-gray-500 text-sm mt-1">Acesso para responsáveis</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchTab('password')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              E-mail e senha
            </button>
            <button
              onClick={() => switchTab('otp')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                tab === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Código por e-mail
            </button>
          </div>

          {/* Password login */}
          {tab === 'password' && (
            <form onSubmit={onPasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <p className="text-xs text-center text-gray-400">
                Ainda não tem senha?{' '}
                <button type="button" onClick={() => switchTab('otp')} className="text-emerald-600 hover:underline">
                  Entre com código por e-mail
                </button>
              </p>
            </form>
          )}

          {/* OTP login */}
          {tab === 'otp' && otpStep === 'email' && (
            <form onSubmit={onRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Enviando código...' : 'Receber código por e-mail'}
              </button>
            </form>
          )}

          {tab === 'otp' && otpStep === 'code' && (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600">
                  Código enviado para <span className="font-medium">{email}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Verifique também a caixa de spam</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de verificação</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Verificando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => { setOtpStep('email'); setError(''); setOtpCode(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Usar outro e-mail
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500">
              É da equipe da escola?{' '}
              <a href="/login" className="text-emerald-600 hover:underline">Entrar como staff</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
