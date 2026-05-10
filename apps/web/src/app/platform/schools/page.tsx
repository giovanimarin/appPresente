'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolsApi } from '@/lib/platform-api';
import { formatDate, cn } from '@/lib/utils';
import { Search, Loader2, AlertTriangle, Plus, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PLAN_COLORS: Record<string, string> = {
  STARTER:    'bg-gray-700 text-gray-300',
  SCHOOL:     'bg-blue-900 text-blue-300',
  NETWORK:    'bg-purple-900 text-purple-300',
  ENTERPRISE: 'bg-yellow-900 text-yellow-300',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
        <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right">{score}</span>
    </div>
  );
}

function StatusBadge({ active, suspendedAt }: { active: boolean; suspendedAt?: string | null }) {
  if (active) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 font-medium">Ativa</span>;
  if (suspendedAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/60 text-orange-400 font-medium">Arquivada</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/60 text-red-400 font-medium">Inativa</span>;
}

type School = {
  id: string; name: string; plan: string; active: boolean; suspendedAt?: string | null;
  city?: string; state?: string; trialEndsAt?: string; createdAt: string;
  metrics: {
    healthScore: number; activeStudents: number; commsSent30d: number;
    readRate30d: number; planUsagePct: number; isTrialing: boolean;
    daysUntilTrialEnd?: number | null; activeGuardians: number;
  };
};

function RowMenu({ school, onRefresh }: { school: School; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<'archive' | 'delete' | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); setConfirming(null); return; }
    const rect = btnRef.current!.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(true);
    setConfirming(null);
  }

  const archiveMutation = useMutation({
    mutationFn: () => schoolsApi.archive(school.id),
    onSuccess: () => { setOpen(false); setConfirming(null); onRefresh(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => schoolsApi.delete(school.id),
    onSuccess: () => { setOpen(false); setConfirming(null); onRefresh(); },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message ?? 'Não foi possível excluir a escola.');
    },
  });

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          ref={ref}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          className="z-50 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1"
        >
          {confirming === 'archive' ? (
            <div className="px-3 py-2 space-y-2">
              <p className="text-xs text-gray-300">Arquivar esta escola?</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(); }}
                  disabled={archiveMutation.isPending}
                  className="flex-1 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium"
                >
                  {archiveMutation.isPending ? '...' : 'Confirmar'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(null); }}
                  className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : confirming === 'delete' ? (
            <div className="px-3 py-2 space-y-2">
              <p className="text-xs text-red-400 font-medium">Excluir permanentemente?</p>
              <p className="text-xs text-gray-500">Só é possível se não houver dados.</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                >
                  {deleteMutation.isPending ? '...' : 'Excluir'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(null); }}
                  className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {school.active && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming('archive'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-yellow-400 hover:bg-gray-700 transition-colors"
                >
                  <Archive size={13} />
                  Arquivar escola
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming('delete'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
              >
                <Trash2 size={13} />
                Excluir escola
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlatformSchoolsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [sort, setSort] = useState('engagement');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-schools-list', { search, plan, sort, page }],
    queryFn: () => schoolsApi.list({
      search: search || undefined,
      plan: plan || undefined,
      sort,
      order: sort === 'engagement' || sort === 'students' ? 'asc' : 'desc',
      page,
      limit: 30,
    }).then((r) => r.data),
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Escolas</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.total ?? '—'} escolas cadastradas</p>
        </div>
        <button
          onClick={() => router.push('/platform/schools/new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nova Escola
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, e-mail ou CNPJ..."
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os planos</option>
          {['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="engagement">Ordenar: Engajamento ↑</option>
          <option value="students">Ordenar: Alunos ↑</option>
          <option value="createdAt">Ordenar: Mais recentes</option>
          <option value="name">Ordenar: Nome</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Escola</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium">Status</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium">Plano</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium">Alunos</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Comms/30d</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Leitura</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Adoção</th>
              <th className="px-3 py-3 text-xs text-gray-500 font-medium">Health</th>
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
                </td>
              </tr>
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500 text-sm">
                  Nenhuma escola encontrada
                </td>
              </tr>
            ) : data?.data?.map((sc: School) => (
              <tr
                key={sc.id}
                onClick={() => router.push(`/platform/schools/${sc.id}`)}
                className="cursor-pointer hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-white text-sm font-medium">{sc.name}</p>
                      <p className="text-gray-500 text-xs">
                        {sc.city && `${sc.city}, ${sc.state} · `}
                        desde {formatDate(sc.createdAt)}
                        {sc.metrics.isTrialing && (
                          <span className="text-yellow-400 ml-1">· trial {sc.metrics.daysUntilTrialEnd}d</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-center">
                  <StatusBadge active={sc.active} suspendedAt={sc.suspendedAt} />
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', PLAN_COLORS[sc.plan])}>
                    {sc.plan}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span className="text-white text-sm font-semibold">{sc.metrics.activeStudents}</span>
                  <span className="text-gray-500 text-xs block">{sc.metrics.planUsagePct}% plano</span>
                </td>
                <td className="px-3 py-3.5 text-center hidden md:table-cell">
                  <span className="text-white text-sm font-semibold">{sc.metrics.commsSent30d}</span>
                </td>
                <td className="px-3 py-3.5 text-center hidden lg:table-cell">
                  <span className={cn(
                    'text-sm font-semibold',
                    sc.metrics.readRate30d >= 60 ? 'text-green-400' : sc.metrics.readRate30d >= 30 ? 'text-yellow-400' : 'text-red-400',
                  )}>
                    {sc.metrics.readRate30d}%
                  </span>
                </td>
                <td className="px-3 py-3.5 text-center hidden lg:table-cell">
                  <span className="text-white text-sm">
                    {sc.metrics.activeStudents > 0
                      ? Math.round((sc.metrics.activeGuardians / sc.metrics.activeStudents) * 100)
                      : 0}%
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <HealthBar score={sc.metrics.healthScore} />
                </td>
                <td className="px-3 py-3.5">
                  <RowMenu school={sc} onRefresh={() => qc.invalidateQueries({ queryKey: ['platform-schools-list'] })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {(data?.total ?? 0) > 30 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-40"
          >Anterior</button>
          <span className="px-3 py-1.5 text-sm text-gray-400">
            {page} / {Math.ceil((data?.total ?? 0) / 30)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil((data?.total ?? 0) / 30)}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-40"
          >Próxima</button>
        </div>
      )}
    </div>
  );
}
