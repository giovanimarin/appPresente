'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import PhoneInput from '@/components/PhoneInput';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: '1 letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 número', test: (v: string) => /[0-9]/.test(v) },
  { label: '1 caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER']),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().refine(
    (v) => v === '' || (v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)),
    { message: 'Mín. 8 chars, 1 maiúscula, 1 número, 1 especial (ou deixe em branco)' },
  ),
});

type FormData = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'COORDINATOR', label: 'Coordenador(a)' },
  { value: 'SECRETARY', label: 'Secretaria' },
  { value: 'TEACHER', label: 'Professor(a)' },
];

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-green-600' : 'text-gray-400')}>
            {ok ? <Check size={12} /> : <X size={12} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pwValue, setPwValue] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', params.id],
    queryFn: () => usersApi.get(params.id).then((r) => r.data),
  });

  // Se o usuário já fez login, não pode alterar e-mail/telefone/senha
  const hasAccessed = !!(user as { lastLoginAt?: string } | undefined)?.lastLoginAt;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', active: true },
  });

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 9) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    else if (digits.length > 6) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    else if (digits.length > 3) masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    setCpfDisplay(masked);
    setValue('cpf', digits || undefined, { shouldDirty: true });
  }

  useEffect(() => {
    if (user) {
      const cpfDigits = user.cpf ?? '';
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone ?? '',
        cpf: cpfDigits,
        password: '',
        active: user.active,
      });
      if (cpfDigits) {
        const d = cpfDigits;
        let masked = d;
        if (d.length > 9) masked = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
        else if (d.length > 6) masked = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
        else if (d.length > 3) masked = `${d.slice(0, 3)}.${d.slice(3)}`;
        setCpfDisplay(masked);
      }
    }
  }, [user, reset]);

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await usersApi.update(params.id, {
        name: data.name,
        email: hasAccessed ? undefined : data.email,
        role: data.role,
        phone: hasAccessed ? undefined : (data.phone || undefined),
        cpf: data.cpf || undefined,
        password: hasAccessed ? undefined : (data.password || undefined),
        active: data.active,
      });
      await qc.invalidateQueries({ queryKey: ['users'] });
      await qc.invalidateQueries({ queryKey: ['user', params.id] });
      router.push('/dashboard/users');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao atualizar usuário.');
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;
  }

  const lockedClass = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed';

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar usuário</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.name}</p>
        </div>
      </div>

      {hasAccessed && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Lock size={14} />
          E-mail, telefone e senha não podem ser alterados após o primeiro acesso do usuário.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input {...register('name')}
              className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none',
                errors.name ? 'border-red-300' : 'border-gray-300')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            {hasAccessed ? (
              <div className="relative">
                <input value={user?.email ?? ''} disabled className={lockedClass} />
                <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            ) : (
              <>
                <input {...register('email')} type="email"
                  className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none',
                    errors.email ? 'border-red-300' : 'border-gray-300')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select {...register('role')}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white">
              {ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            {hasAccessed ? (
              <div className="relative">
                <input value={user?.phone ?? ''} disabled className={lockedClass} />
                <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            ) : (
              <PhoneInput {...register('phone')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>
            </label>
            {hasAccessed ? (
              <div className="relative">
                <input value="••••••••" disabled className={lockedClass} />
                <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nova senha..."
                    onChange={(e) => { register('password').onChange(e); setPwValue(e.target.value); }}
                    className={cn('w-full px-3 py-2.5 pr-10 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none',
                      errors.password ? 'border-red-300' : 'border-gray-300')}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                <PasswordStrength value={pwValue} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="active" {...register('active')} className="rounded" />
            <label htmlFor="active" className="text-sm text-gray-700 cursor-pointer">Usuário ativo</label>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
          <button type="submit" disabled={isSubmitting || !isDirty}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60">
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
