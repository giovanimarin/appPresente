'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolsApi } from '@/lib/platform-api';
import { formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft, Users, MessageSquare, Calendar, FileText,
  AlertTriangle, CheckCircle2, TrendingUp, Edit3, Save, X, KeyRound, User,
} from 'lucide-react';
import DateInput from '@/components/DateInput';

const PLAN_OPTIONS = ['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE'];

function MetricBox({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color ?? 'text-white')}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function ActivityRow({ label, icon: Icon, period }: {
  label: string;
  icon: React.ElementType;
  period: { days: number; commsSent?: number; reads?: number; agendaEvents?: number; formSubmissions?: number }[];
}) {
  return (
    <tr className="border-b border-gray-800">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <Icon size={14} className="text-gray-500" />
          {label}
        </div>
      </td>
      {period.map((p) => (
        <td key={p.days} className="py-3 text-center text-white font-semibold text-sm">
          {label === 'Comunicados' ? p.commsSent
            : label === 'Leituras' ? p.reads
            : label === 'Eventos' ? p.agendaEvents
            : p.formSubmissions}
        </td>
      ))}
    </tr>
  );
}

export default function SchoolHealthPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{
    plan?: string; note?: string; billingEmail?: string;
    trialEndsAt?: string; maxStudents?: string; active?: boolean;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['platform-school', id],
    queryFn: () => schoolsApi.health(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: directorData } = useQuery({
    queryKey: ['platform-school-director', id],
    queryFn: () => schoolsApi.getDirector(id).then((r) => r.data),
    enabled: !!id,
  });

  const [resetResult, setResetResult] = useState<{ name: string; newPassword: string } | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, name }: { userId: string; name: string }) =>
      schoolsApi.resetDirectorPassword(id, userId).then((r) => ({ ...r.data, name })),
    onSuccess: (result) => setResetResult(result),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => schoolsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-school', id] });
      qc.invalidateQueries({ queryKey: ['platform-schools'] });
      setEditing(false);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { school, users, students, guardians, activity, commsByType } = data;

  const totalGuardians = Object.values(guardians.byStatus as Record<string, number>).reduce((a, b) => a + b, 0);
  const activeGuardians = (guardians.byStatus?.ACTIVE ?? 0) as number;
  const adoptionRate = students.active > 0
    ? Math.round((activeGuardians / students.active) * 100)
    : 0;

  function handleSave() {
    const payload: Record<string, unknown> = {};
    if (form.plan) payload.plan = form.plan;
    if (form.note !== undefined) payload.platformNote = form.note;
    if (form.billingEmail) payload.billingEmail = form.billingEmail;
    if (form.trialEndsAt) payload.trialEndsAt = new Date(form.trialEndsAt).toISOString();
    if (form.maxStudents) payload.maxStudents = parseInt(form.maxStudents);
    if (form.active !== undefined) payload.active = form.active;
    updateMutation.mutate(payload);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{school.name}</h1>
            <span className="text-xs px-2 py-1 rounded bg-indigo-900 text-indigo-300 font-medium">
              {school.plan}
            </span>
            {!school.active && (
              <span className="text-xs px-2 py-1 rounded bg-red-900 text-red-300 font-medium">
                Suspenso
              </span>
            )}
            {school.isTrialing && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-900 text-yellow-300 font-medium">
                Trial · {school.daysUntilTrialEnd}d restantes
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {school.email} · desde {formatDate(school.createdAt)}
          </p>
        </div>
        <button
          onClick={() => {
            if (editing) {
              setEditing(false);
            } else {
              setForm({
                plan: school.plan,
                note: school.platformNote ?? '',
                billingEmail: school.billingEmail ?? '',
                active: school.active,
              });
              setEditing(true);
            }
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            editing
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
          )}
        >
          {editing ? <><X size={14} /> Cancelar</> : <><Edit3 size={14} /> Editar</>}
        </button>
      </div>

      {/* Edição inline */}
      {editing && (
        <div className="bg-gray-900 border border-indigo-800/50 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Configurações da escola</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Plano</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Limite de alunos (override)</label>
              <input
                type="number"
                value={form.maxStudents ?? ''}
                onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                placeholder="Padrão do plano"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">E-mail de cobrança</label>
              <input
                type="email"
                value={form.billingEmail ?? ''}
                onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Fim do trial</label>
              <DateInput
                value={form.trialEndsAt ?? ''}
                onChange={(v) => setForm({ ...form, trialEndsAt: v })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Nota interna</label>
            <textarea
              rows={2}
              value={form.note ?? ''}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Observações sobre o cliente..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active ?? true}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="accent-indigo-600 w-4 h-4"
              />
              <span className="text-gray-300 text-sm">Conta ativa</span>
            </label>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
            >
              <Save size={14} />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Nota interna */}
      {school.platformNote && !editing && (
        <div className="bg-yellow-950/30 border border-yellow-900/40 rounded-lg px-4 py-3 text-yellow-300 text-sm">
          <span className="font-medium">Nota:</span> {school.platformNote}
        </div>
      )}

      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox label="Alunos ativos" value={students.active}
          sub={`${students.inactive} inativos`} />
        <MetricBox label="Responsáveis ativos" value={activeGuardians}
          sub={`${adoptionRate}% de adoção`} color={adoptionRate >= 70 ? 'text-green-400' : 'text-yellow-400'} />
        <MetricBox label="Uso do plano" value={`${Math.round((students.active / (school.planLimit ?? 1)) * 100)}%`}
          sub={`${students.active} / ${school.planLimit} alunos`} />
        <MetricBox label="Responsáveis sem acesso" value={guardians.neverAccessed}
          color={guardians.neverAccessed > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      {/* Diretor(es) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <User size={14} className="text-gray-500" />
          Administrador(es) da escola
        </h2>

        {resetResult && (
          <div className="mb-4 bg-green-950/40 border border-green-800/50 rounded-lg p-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-green-400 text-xs font-medium">Nova senha gerada para {resetResult.name}</p>
              <p className="text-green-300 font-mono text-sm mt-0.5">{resetResult.newPassword}</p>
              <p className="text-green-600 text-xs mt-0.5">Copie agora — não será exibida novamente.</p>
            </div>
            <button onClick={() => setResetResult(null)} className="text-green-600 hover:text-green-400">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-2">
          {!directorData?.admins?.length ? (
            <p className="text-gray-500 text-sm">Nenhum administrador encontrado.</p>
          ) : directorData.admins.map((admin: { id: string; name: string; email: string; lastLoginAt?: string | null }) => (
            <div key={admin.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">{admin.name}</p>
                <p className="text-gray-400 text-xs">{admin.email}</p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {admin.lastLoginAt ? `Último acesso: ${formatDate(admin.lastLoginAt)}` : 'Nunca acessou'}
                </p>
              </div>
              <button
                onClick={() => resetPasswordMutation.mutate({ userId: admin.id, name: admin.name })}
                disabled={resetPasswordMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <KeyRound size={12} />
                Redefinir senha
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Equipe */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-3">Equipe da escola</h2>
        <div className="flex gap-6 flex-wrap text-sm">
          {Object.entries(users.byRole as Record<string, number>).map(([role, count]) => (
            <div key={role} className="flex items-center gap-2">
              <span className="text-gray-400">{role}</span>
              <span className="text-white font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Atividade por período */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Atividade por período</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 text-gray-500 text-xs font-medium">Módulo</th>
              {activity.map((p: { days: number }) => (
                <th key={p.days} className="text-center py-2 text-gray-500 text-xs font-medium">
                  Últimos {p.days}d
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ActivityRow label="Comunicados" icon={MessageSquare} period={activity} />
            <ActivityRow label="Leituras" icon={CheckCircle2} period={activity} />
            <ActivityRow label="Eventos" icon={Calendar} period={activity} />
            <ActivityRow label="Formulários" icon={FileText} period={activity} />
          </tbody>
        </table>
      </div>

      {/* Tipos de comunicado */}
      {commsByType?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-3">Comunicados por tipo (30 dias)</h2>
          <div className="flex gap-3 flex-wrap">
            {commsByType.map((ct: { schoolType: string; _count: { schoolType: number } }) => (
              <div key={ct.schoolType} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-gray-400 text-xs">{ct.schoolType}</span>
                <span className="text-white font-bold text-sm">{ct._count.schoolType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
