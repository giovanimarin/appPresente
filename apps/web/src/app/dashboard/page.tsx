'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { formatDate, formatPhone } from '@/lib/utils';
import {
  Users, MessageSquare, Calendar, FileText,
  TrendingUp, AlertCircle, Clock
} from 'lucide-react';

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={24} />
        <p className="text-red-700">Erro ao carregar painel</p>
      </div>
    );
  }

  const stats = data?.overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Painel</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral da escola</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Alunos ativos"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          label="Responsáveis ativos"
          value={stats?.activeGuardians ?? 0}
          sub={stats?.pendingGuardians ? `${stats.pendingGuardians} pendentes` : undefined}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          label="Comunicados (30 dias)"
          value={stats?.sentLast30Days ?? 0}
          sub={`Taxa de leitura: ${stats?.readRateLast30Days ?? 0}%`}
          icon={MessageSquare}
          color="bg-purple-500"
        />
        <StatCard
          label="Próximos eventos"
          value={stats?.upcomingEvents ?? 0}
          sub="Próximos 7 dias"
          icon={Calendar}
          color="bg-orange-500"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={18} className="text-green-500" />
            <span className="font-medium text-sm text-gray-900">Taxa de leitura geral</span>
          </div>
          <div className="relative pt-1">
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${stats?.readRateLast30Days ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats?.readRateLast30Days ?? 0}% nos últimos 30 dias</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={18} className="text-orange-500" />
            <span className="font-medium text-sm text-gray-900">Formulários pendentes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.pendingFormSubmissions ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">aguardando revisão</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={18} className="text-red-500" />
            <span className="font-medium text-sm text-gray-900">Nunca acessaram</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.neverAccessedGuardians?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">responsáveis sem acesso</p>
        </div>
      </div>

      {/* Never accessed guardians */}
      {(data?.neverAccessedGuardians?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-sm text-gray-900">Responsáveis sem acesso</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ativaram a conta mas nunca abriram o app</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.neverAccessedGuardians?.slice(0, 5).map((g: {
              id: string; name: string; phone: string; activatedAt: string;
              studentGuardians: { student: { name: string } }[];
            }) => (
              <div key={g.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-500">
                    {g.studentGuardians.map((sg) => sg.student.name).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{g.phone ? formatPhone(g.phone) : '—'}</p>
                  <p className="text-xs text-gray-400">Ativou em {formatDate(g.activatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
