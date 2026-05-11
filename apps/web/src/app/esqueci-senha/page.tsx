'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setSubmitError('');
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      setSubmitError('Erro ao processar solicitação. Tente novamente.');
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
            <h1 className="text-2xl font-bold text-gray-900">Recuperar senha</h1>
            <p className="text-gray-500 text-sm mt-1">Informe seu e-mail para receber o link</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com.br"
                  autoComplete="email"
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300',
                  )}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{submitError}</p>
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
                {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <p className="text-sm text-gray-600">
                Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
              </p>
              <p className="text-xs text-gray-400">Verifique também sua caixa de spam.</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <a href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft size={14} /> Voltar ao login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
