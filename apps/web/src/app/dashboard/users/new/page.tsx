'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import PhoneInput from '@/components/PhoneInput';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['SECRETARY', 'COORDINATOR', 'TEACHER'], {
    required_error: 'Selecione um perfil',
  }),
  phone: z.string().optional(),
  cpf: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: 'TEACHER', label: 'Professor(a)' },
  { value: 'COORDINATOR', label: 'Coordenador(a)' },
  { value: 'SECRETARY', label: 'Secretaria' },
];

export default function NewUserPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'TEACHER' },
  });

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 9) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    else if (digits.length > 6) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    else if (digits.length > 3) masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    setCpfDisplay(masked);
    setValue('cpf', digits || undefined);
  }

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await usersApi.create({
        ...data,
        phone: data.phone || undefined,
        cpf: data.cpf || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['users'] });
      router.push('/dashboard/users');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao criar usuário.');
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Novo usuário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Adicionar membro à equipe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              {...register('name')}
              placeholder="Maria Silva"
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none',
                errors.name ? 'border-red-300' : 'border-gray-300',
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              {...register('email')}
              type="email"
              placeholder="maria@escola.com.br"
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none',
                errors.email ? 'border-red-300' : 'border-gray-300',
              )}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">Um e-mail com o link de primeiro acesso será enviado automaticamente para o usuário.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select
              {...register('role')}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white',
                errors.role ? 'border-red-300' : 'border-gray-300',
              )}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</label>
            <PhoneInput
              {...register('phone')}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF (opcional)</label>
            <input
              value={cpfDisplay}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      </form>
    </div>
  );
}
