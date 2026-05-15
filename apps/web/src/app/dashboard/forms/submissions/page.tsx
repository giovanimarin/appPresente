'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Loader2, Paperclip } from 'lucide-react';

type Field = { id: string; type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DATE' | 'TIME' | 'FILE'; label: string; required: boolean };
type Form = { id: string; title: string; fields: Field[] };
type Submission = {
  id: string;
  status: string;
  submittedAt: string;
  protocolNumber?: string;
  form: Form;
  guardian: { id: string; name: string; phone: string };
  student: { id: string; name: string };
  answers: Record<string, unknown>;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:      { label: 'Pendente',   color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  UNDER_REVIEW: { label: 'Em análise', color: 'text-blue-700',   bg: 'bg-blue-100',   icon: AlertCircle },
  RESOLVED:     { label: 'Resolvido',  color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle2 },
};

function formatIsoToBR(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return value;
}

function AnswerValue({ field, value }: { field?: Field; value: unknown }) {
  if (field?.type === 'FILE') {
    const f = value as { filename?: string };
    return (
      <span className="flex items-center gap-1.5 text-indigo-600">
        <Paperclip size={12} />
        {f?.filename ?? '—'}
      </span>
    );
  }
  if (field?.type === 'CHECKBOX') return <span>{value ? 'Sim' : 'Não'}</span>;
  if (field?.type === 'DATE') return <span>{formatIsoToBR(String(value ?? ''))}</span>;
  if (field?.type === 'TIME') return <span>{String(value ?? '—')}</span>;
  return <span>{String(value ?? '—')}</span>;
}

export default function SubmissionsPage() {
  const qc = useQueryClient();
  const [formFilter, setFormFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: formsData } = useQuery({
    queryKey: ['forms-list'],
    queryFn: () => formsApi.list({ limit: 100 }).then((r) => r.data),
  });
  const forms: Form[] = formsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['all-submissions', { formId: formFilter, status: statusFilter, page }],
    queryFn: () => formsApi.allSubmissions({
      page,
      limit: 20,
      formId: formFilter || undefined,
      status: statusFilter || undefined,
    }).then((r) => r.data),
  });

  const submissions: Submission[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const fieldsMap = useMemo(() => {
    const map: Record<string, Record<string, Field>> = {};
    for (const form of forms) {
      map[form.id] = Object.fromEntries((form.fields ?? []).map((f) => [f.id, f]));
    }
    return map;
  }, [forms]);

  const resolveMut = useMutation({
    mutationFn: (sub: Submission) => formsApi.resolve(sub.form.id, sub.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-submissions'] }),
  });

  function resetFilters() {
    setFormFilter('');
    setStatusFilter('');
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pedidos dos Responsáveis</h1>
        <p className="text-sm text-gray-500 mt-0.5">Justificativas e solicitações enviadas pelas famílias</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={formFilter}
          onChange={(e) => { setFormFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none min-w-[180px]"
        >
          <option value="">Todos os tipos</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>

        <div className="flex gap-2">
          {(['', 'PENDING', 'UNDER_REVIEW', 'RESOLVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300',
              )}
            >
              {s === '' ? 'Todos' : STATUS_CFG[s].label}
            </button>
          ))}
        </div>

        {(formFilter || statusFilter) && (
          <button onClick={resetFilters} className="text-sm text-gray-400 hover:text-gray-600 underline">
            Limpar filtros
          </button>
        )}

        {total > 0 && (
          <span className="ml-auto text-sm text-gray-400">{total} pedido{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">Nenhum pedido encontrado</div>
        ) : (
          submissions.map((sub) => {
            const cfg = STATUS_CFG[sub.status] ?? STATUS_CFG.PENDING;
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === sub.id;
            const fieldMap = fieldsMap[sub.form.id] ?? {};

            return (
              <div key={sub.id}>
                <div
                  className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {sub.form.title}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                        <StatusIcon size={11} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{sub.student.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sub.guardian.name} · {formatDate(sub.submittedAt)}
                      {sub.protocolNumber && <span className="font-mono ml-2">· Prot. {sub.protocolNumber}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sub.status !== 'RESOLVED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveMut.mutate(sub); }}
                        disabled={resolveMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 rounded-lg text-xs hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle2 size={12} />
                        Resolver
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="pt-3 space-y-2">
                      {Object.entries(sub.answers).map(([fieldId, val]) => {
                        if (val === undefined || val === null || val === '') return null;
                        const field = fieldMap[fieldId];
                        const label = field?.label ?? fieldId;
                        return (
                          <div key={fieldId} className="flex gap-2 text-sm">
                            <span className="text-gray-500 font-medium min-w-[140px] flex-shrink-0">{label}:</span>
                            <span className="text-gray-800">
                              <AnswerValue field={field} value={val} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Anterior</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  );
}
