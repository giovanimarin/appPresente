'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número'),
  confirmPassword: z.string().min(1, 'Confirme sua senha'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [tokenError, setTokenError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) setTokenError('Link inválido. Solicite uma nova recuperação de senha.');
  }, [token]);

  async function onSubmit(data: FormData) {
    setSubmitError('');
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setSubmitError(e.response?.data?.error ?? 'Link inválido ou expirado.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
            <p className="text-gray-500 text-sm mt-1">Escolha uma nova senha para sua conta</p>
          </div>

          {tokenError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-sm text-red-700">{tokenError}</p>
              <a href="/esqueci-senha" className="text-sm text-primary-600 hover:underline mt-2 inline-block">
                Solicitar novo link
              </a>
            </div>
          )}

          {!tokenError && !success && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      'w-full px-3 py-2.5 pr-10 rounded-lg border text-sm transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300',
                    )}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                <div className="relative">
                  <input
                    {...register('confirmPassword')}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      'w-full px-3 py-2.5 pr-10 rounded-lg border text-sm transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                      errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300',
                    )}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              <p className="text-xs text-gray-400">Mínimo 8 caracteres, uma letra maiúscula e um número.</p>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{submitError}</p>
                  <a href="/esqueci-senha" className="text-sm text-primary-600 hover:underline mt-1 inline-block">
                    Solicitar novo link
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm transition-colors',
                  'bg-primary-600 hover:bg-primary-700',
                  isSubmitting && 'opacity-70 cursor-not-allowed',
                )}
              >
                {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}

          {success && (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Senha redefinida!</h2>
              <p className="text-sm text-gray-500">Sua senha foi atualizada com sucesso.</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Ir para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    }>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
