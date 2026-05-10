'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardiansApi } from '@/lib/api';
import { isAuthenticated, clearTokens } from '@/lib/auth';
import { User, Mail, Phone, LogOut, Save, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api';

type Guardian = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  activatedAt?: string;
};

type SchoolEntry = {
  school: { id: string; name: string };
  students: { id: string; name: string; grade: string; relationship: string }[];
  preference: { color: string; nickname?: string };
};

export default function GuardianPerfilPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.push('/guardian');
  }, [router]);

  const { data: me, isLoading } = useQuery<Guardian>({
    queryKey: ['guardian-me'],
    queryFn: () => guardiansApi.getMe().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: schools = [] } = useQuery<SchoolEntry[]>({
    queryKey: ['guardian-my-schools'],
    queryFn: () => guardiansApi.mySchools().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  useEffect(() => {
    if (me) {
      setName(me.name);
      setEmail(me.email ?? '');
    }
  }, [me]);

  const updateMutation = useMutation({
    mutationFn: () => guardiansApi.updateMe({ name, email: email || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian-me'] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  async function savePassword() {
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('A senha deve ter ao menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('As senhas não coincidem'); return; }
    setSavingPassword(true);
    try {
      await authApi.guardianSetPassword({ currentPassword: currentPassword || undefined, newPassword });
      setPasswordSaved(true);
      setShowPasswordForm(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setPasswordError(e.response?.data?.error ?? 'Erro ao salvar senha');
    } finally {
      setSavingPassword(false);
    }
  }

  function logout() {
    clearTokens();
    router.push('/guardian');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 pb-3 max-w-lg mx-auto">
        <h1 className="font-bold text-gray-900 text-base">Perfil</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-indigo-700 font-bold text-2xl">
              {me?.name?.[0]?.toUpperCase() ?? 'R'}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-lg">{me?.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Responsável</p>
        </div>

        {/* Dados pessoais */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Dados pessoais</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-600 font-medium"
              >
                Editar
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-0.5">Nome</label>
              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-800">{me?.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-0.5">E-mail (login)</label>
              {editing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-800">{me?.email ?? '—'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-0.5">Telefone</label>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" />
                <span className="text-sm text-gray-800">{me?.phone ? formatPhone(me.phone) : '—'}</span>
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!name || updateMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save size={14} />
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => { setEditing(false); setName(me?.name ?? ''); setEmail(me?.email ?? ''); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          )}

          {saved && (
            <p className="text-xs text-green-600 font-medium">Dados salvos com sucesso!</p>
          )}
        </div>

        {/* Escolas vinculadas */}
        {schools.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Escolas e filhos</h2>
            {schools.map((entry) => (
              <div key={entry.school.id} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: entry.preference.color }}
                >
                  {entry.school.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.school.name}</p>
                  <p className="text-xs text-gray-500">
                    {entry.students.map((s) => `${s.name} (${s.relationship})`).join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Senha */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Senha de acesso</h2>
            </div>
            {!showPasswordForm && (
              <button onClick={() => setShowPasswordForm(true)} className="text-xs text-indigo-600 font-medium">
                {me?.email ? 'Alterar senha' : 'Definir senha'}
              </button>
            )}
          </div>

          {passwordSaved && (
            <p className="text-xs text-green-600 font-medium">Senha salva com sucesso!</p>
          )}

          {!showPasswordForm && (
            <p className="text-xs text-gray-400">
              {me?.email
                ? 'Use seu e-mail e senha para entrar sem precisar de código.'
                : 'Defina uma senha para entrar sem precisar de código por e-mail.'}
            </p>
          )}

          {showPasswordForm && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Senha atual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Deixe em branco se ainda não tem senha"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-gray-200 text-sm"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              {passwordError && (
                <p className="text-xs text-red-600">{passwordError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={savePassword}
                  disabled={savingPassword || !newPassword}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Save size={14} />
                  {savingPassword ? 'Salvando...' : 'Salvar senha'}
                </button>
                <button
                  onClick={() => { setShowPasswordForm(false); setPasswordError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
