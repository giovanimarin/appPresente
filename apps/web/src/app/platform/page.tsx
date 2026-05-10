'use client';

import { useQuery } from '@tanstack/react-query';
import { schoolsApi } from '@/lib/platform-api';
import { cn } from '@/lib/utils';
import { Building2, Users, MessageSquare, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  const bg = score >= 70 ? 'bg-green-400/10' : score >= 40 ? 'bg-yellow-400/10' : 'bg-red-400/10';
  const label = score >= 70 ? 'Saudável' : score >= 40 ? 'Atenção' : 'Risco';
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', bg, color)}>
      {score >= 70 ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {label} · {score}
    </span>
  );
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-700 text-gray-300',
  SCHOOL: 'bg-blue-900 text-blue-300',
  NETWORK: 'bg-purple-900 text-purple-300',
  ENTERPRISE: 'bg-yellow-900 text-yellow-300',
};

export default function PlatformDashboard() {
  const { data: summary } = useQuery({
    queryKey: ['platform-summary'],
    queryFn: () => schoolsApi.summary().then((r) => r.data),
  });

  const { data: schoolsData, isLoading } = useQuery({
    queryKey: ['platform-schools'],
    queryFn: () => schoolsApi.list({ limit: 50, sort: 'engagement', order: 'asc' }).then((r) => r.data),
  });

  const s = summary?.schools;
  const a = summary?.activity;

  // Separar escolas por health score
  const schools = schoolsData?.data ?? [];
  const atRisk = schools.filter((sc: { metrics: { healthScore: number } }) => sc.metrics.healthScore < 40);
  const needAttention = schools.filter((sc: { metrics: { healthScore: number } }) => sc.metrics.healthScore >= 40 && sc.metrics.healthScore < 70);
  const healthy = schools.filter((sc: { metrics: { healthScore: number } }) => sc.metrics.healthScore >= 70);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-white">Visão Geral da Plataforma</h1>
        <p className="text-gray-400 text-sm mt-0.5">{s?.total ?? '—'} escolas cadastradas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Escolas ativas" value={s?.active ?? '—'}
          sub={s?.trialing ? `${s.trialing} em trial` : undefined}
          icon={Building2} color="bg-indigo-600" />
        <StatCard label="Alunos ativos" value={summary?.users?.totalStudents ?? '—'}
          icon={Users} color="bg-blue-600" />
        <StatCard label="Comunicados (30d)" value={a?.commsSentLast30Days ?? '—'}
          sub={a ? `${a.readsLast30Days} leituras` : undefined}
          icon={MessageSquare} color="bg-purple-600" />
        <StatCard label="Novas escolas (30d)" value={s?.newLast30Days ?? '—'}
          icon={TrendingUp} color="bg-green-600" />
      </div>

      {/* Distribuição por plano */}
      {s?.byPlan && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Distribuição por plano</h2>
          <div className="flex gap-6 flex-wrap">
            {Object.entries(s.byPlan).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-1 rounded font-medium', PLAN_COLORS[plan])}>
                  {plan}
                </span>
                <span className="text-white font-bold">{count as number}</span>
                <span className="text-gray-500 text-xs">escola{(count as number) !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escolas em risco */}
      {atRisk.length > 0 && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-900/40 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-red-300 font-semibold text-sm">{atRisk.length} escola{atRisk.length !== 1 ? 's' : ''} em risco de churn</span>
          </div>
          <SchoolTable schools={atRisk} />
        </div>
      )}

      {/* Precisam de atenção */}
      {needAttention.length > 0 && (
        <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-900/30 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-yellow-300 font-semibold text-sm">{needAttention.length} escola{needAttention.length !== 1 ? 's' : ''} com engajamento baixo</span>
          </div>
          <SchoolTable schools={needAttention} />
        </div>
      )}

      {/* Saudáveis */}
      {healthy.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <span className="text-gray-300 font-semibold text-sm">{healthy.length} escola{healthy.length !== 1 ? 's' : ''} saudáveis</span>
          </div>
          <SchoolTable schools={healthy} />
        </div>
      )}
    </div>
  );
}

function SchoolTable({ schools }: { schools: {
  id: string; name: string; plan: string; city?: string; state?: string;
  active: boolean; trialEndsAt?: string;
  metrics: {
    healthScore: number; activeStudents: number; activeGuardians: number;
    commsSent30d: number; readRate30d: number; daysUntilTrialEnd?: number | null;
    isTrialing: boolean; planUsagePct: number; lastActivityAt?: string | null;
  };
}[] }) {
  return (
    <div className="divide-y divide-gray-800/50">
      {schools.map((sc) => (
        <a
          key={sc.id}
          href={`/platform/schools/${sc.id}`}
          className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/30 transition-colors"
        >
          {/* Nome e localização */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white text-sm font-medium truncate">{sc.name}</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium shrink-0', PLAN_COLORS[sc.plan])}>
                {sc.plan}
              </span>
              {sc.metrics.isTrialing && sc.metrics.daysUntilTrialEnd !== null && (
                <span className="text-xs text-yellow-400 shrink-0">
                  trial {sc.metrics.daysUntilTrialEnd}d
                </span>
              )}
            </div>
            {sc.city && (
              <p className="text-xs text-gray-500">{sc.city}, {sc.state}</p>
            )}
          </div>

          {/* Métricas */}
          <div className="hidden md:flex items-center gap-6 text-xs text-gray-400">
            <div className="text-center">
              <p className="text-white font-semibold">{sc.metrics.activeStudents}</p>
              <p>alunos</p>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">{sc.metrics.commsSent30d}</p>
              <p>comms/30d</p>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">{sc.metrics.readRate30d}%</p>
              <p>leitura</p>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">{sc.metrics.planUsagePct}%</p>
              <p>uso plano</p>
            </div>
          </div>

          <HealthBadge score={sc.metrics.healthScore} />
        </a>
      ))}
    </div>
  );
}
