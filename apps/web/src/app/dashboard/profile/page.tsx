'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Save, Eye, EyeOff, CheckCircle2, Loader2, Check, X } from 'lucide-react';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: '1 letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 número', test: (v: string) => /[0-9]/.test(v) },
  { label: '1 caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual'),
  newPassword: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de 1 letra maiúscula')
    .regex(/[0-9]/, 'Precisa de 1 número')
    .regex(/[^A-Za-z0-9]/, 'Precisa de 1 caractere especial'),
  confirmPassword: z.string().min(1, 'Confirme a nova senha'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Diretor(a)', SECRETARY: 'Secretaria', COORDINATOR: 'Coordenador(a)', TEACHER: 'Professor(a)',
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

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

export default function ProfilePage() {
  const localUser = getUser();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPwValue, setNewPwValue] = useState('');

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authApi.me().then((r) => r.data),
  });

  const user = meData?.user ?? localUser;

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name ?? '', email: user.email ?? '', phone: (user as { phone?: string }).phone ?? '' });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => authApi.updateMe(data),
    onSuccess: (res) => {
      const updated = res.data.user;
      setUser({ id: updated.id, schoolId: updated.schoolId, role: updated.role, name: updated.name, email: updated.email });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      authApi.updateMe({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      passwordForm.reset();
      setNewPwValue('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
  });

  const inputClass = (hasError?: boolean) => cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    hasError ? 'border-red-300 bg-red-50' : 'border-gray-300',
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie suas informações pessoais e senha de acesso</p>
      </div>

      {/* Avatar + papel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <span className="text-primary-700 font-bold text-xl">{user?.name?.[0]?.toUpperCase() ?? '?'}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name ?? '—'}</p>
          <p className="text-sm text-gray-500">{user?.email ?? '—'}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-medium">
            {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'}
          </span>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Dados pessoais</h2>
        <form onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
          <Field label="Nome completo" error={profileForm.formState.errors.name?.message}>
            <input {...profileForm.register('name')} className={inputClass(!!profileForm.formState.errors.name)} placeholder="Seu nome" />
          </Field>

          <Field label="E-mail" error={profileForm.formState.errors.email?.message}>
            <input {...profileForm.register('email')} type="email" className={inputClass(!!profileForm.formState.errors.email)} placeholder="seu@email.com" />
          </Field>

          <Field label="Telefone" error={profileForm.formState.errors.phone?.message}>
            <input {...profileForm.register('phone')} type="tel" className={inputClass()} placeholder="(11) 99999-9999" />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!profileForm.formState.isDirty || profileMutation.isPending}
              className={cn('flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium',
                'hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed')}
            >
              {profileMutation.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                : <><Save size={14} /> Salvar dados</>}
            </button>
            {profileSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle2 size={14} /> Dados atualizados!</span>
            )}
            {profileMutation.isError && (
              <span className="text-sm text-red-600">
                {(profileMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao salvar'}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Alterar senha</h2>
        <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))} className="space-y-4">
          <Field label="Senha atual" error={passwordForm.formState.errors.currentPassword?.message}>
            <div className="relative">
              <input {...passwordForm.register('currentPassword')} type={showCurrent ? 'text' : 'password'}
                className={cn(inputClass(!!passwordForm.formState.errors.currentPassword), 'pr-10')}
                placeholder="••••••••" autoComplete="current-password" />
              <button type="button" tabIndex={-1} onClick={() => setShowCurrent((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Nova senha" error={passwordForm.formState.errors.newPassword?.message}>
            <div className="relative">
              <input
                {...passwordForm.register('newPassword')}
                type={showNew ? 'text' : 'password'}
                className={cn(inputClass(!!passwordForm.formState.errors.newPassword), 'pr-10')}
                placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                onChange={(e) => { passwordForm.register('newPassword').onChange(e); setNewPwValue(e.target.value); }}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <PasswordStrength value={newPwValue} />
          </Field>

          <Field label="Confirmar nova senha" error={passwordForm.formState.errors.confirmPassword?.message}>
            <div className="relative">
              <input {...passwordForm.register('confirmPassword')} type={showConfirm ? 'text' : 'password'}
                className={cn(inputClass(!!passwordForm.formState.errors.confirmPassword), 'pr-10')}
                placeholder="Repita a nova senha" autoComplete="new-password" />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={passwordMutation.isPending}
              className={cn('flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium',
                'hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed')}>
              {passwordMutation.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Alterando...</>
                : <><Save size={14} /> Alterar senha</>}
            </button>
            {passwordSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle2 size={14} /> Senha alterada!</span>
            )}
            {passwordMutation.isError && (
              <span className="text-sm text-red-600">
                {(passwordMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Senha atual incorreta'}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
