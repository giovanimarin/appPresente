'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { ArrowLeft, Loader2, CheckCircle2, Clock, FileText, ToggleLeft, ToggleRight } from 'lucide-react';

type Field = { id: string; type: string; label: string; required: boolean; options?: string[] };
type Submission = {
  id: string; status: string; submittedAt: string; protocolNumber?: string;
  guardian: { name: string; phone: string };
  student: { name: string };
  answers: Record<string, unknown>;
};

const STATUS_LABELS: Record<string, string> = { PENDING: 'Pendente', UNDER_REVIEW: 'Em análise', RESOLVED: 'Resolvido' };
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700', UNDER_REVIEW: 'bg-blue-100 text-blue-700', RESOLVED: 'bg-green-100 text-green-700',
};

export default function FormDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', params.id],
    queryFn: () => formsApi.get(params.id).then((r) => r.data),
  });

  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ['form-submissions', params.id, { page, status: statusFilter }],
    queryFn: () => formsApi.submissions(params.id, { page, limit: 20, status: statusFilter || undefined }).then((r) => r.data),
  });

  const toggleStatusMut = useMutation({
    mutationFn: () => formsApi.update(params.id, { status: form?.status === 'OPEN' ? 'CLOSED' : 'OPEN' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form', params.id] }),
  });

  const resolveMut = useMutation({
    mutationFn: (submissionId: string) => formsApi.resolve(params.id, submissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-submissions', params.id] }),
  });

  const totalPages = Math.ceil((submissions?.total ?? 0) / 20);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{form?.title}</h1>
          {form?.description && <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>}
        </div>
        <button onClick={() => toggleStatusMut.mutate()} disabled={toggleStatusMut.isPending}
          className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors', form?.status === 'OPEN' ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50')}>
          {form?.status === 'OPEN' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          {form?.status === 'OPEN' ? 'Aberto' : 'Fechado'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{form?._count?.submissions ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Submissões</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{(form?.fields as Field[])?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Campos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-700">{form?.expiresAt ? formatDate(form.expiresAt) : '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">Expira em</p>
        </div>
      </div>

      {/* Fields preview */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2"><FileText size={14} /> Campos</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(form?.fields as Field[])?.map((field, i) => (
            <div key={field.id} className="px-5 py-3 flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{field.label}</p>
                <p className="text-xs text-gray-400">{field.type}{field.required ? ' · Obrigatório' : ''}</p>
              </div>
              {field.options && field.options.length > 0 && (
                <p className="text-xs text-gray-400">{field.options.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submissions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Submissões</h2>
          <div className="flex items-center gap-2">
            {['', 'PENDING', 'UNDER_REVIEW', 'RESOLVED'].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', statusFilter === s ? 'bg-primary-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-primary-300')}>
                {s === '' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {loadingSubmissions ? (
            <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-primary-600" /></div>
          ) : submissions?.data?.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nenhuma submissão</div>
          ) : submissions?.data?.map((sub: Submission) => (
            <div key={sub.id} className="px-5 py-4">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{sub.student?.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[sub.status])}>{STATUS_LABELS[sub.status]}</span>
                  </div>
                  <p className="text-xs text-gray-400">{sub.guardian?.name} · {formatDate(sub.submittedAt)}{sub.protocolNumber ? ` · Prot. ${sub.protocolNumber}` : ''}</p>
                </div>
                {sub.status !== 'RESOLVED' && (
                  <button onClick={(e) => { e.stopPropagation(); resolveMut.mutate(sub.id); }} disabled={resolveMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 rounded-lg text-xs hover:bg-green-50">
                    <CheckCircle2 size={12} /> Resolver
                  </button>
                )}
                {sub.status === 'RESOLVED' && <Clock size={14} className="text-green-400 flex-shrink-0" />}
              </div>
              {expandedId === sub.id && (
                <div className="mt-3 ml-0 bg-gray-50 rounded-lg p-3 space-y-2">
                  {Object.entries(sub.answers ?? {}).map(([key, val]) => {
                    const field = (form?.fields as Field[] ?? []).find((f) => f.id === key);
                    const label = field?.label ?? key;
                    const raw = String(val);
                    const display = field?.type === 'FILE'
                      ? (val as { filename?: string })?.filename ?? '—'
                      : field?.type === 'CHECKBOX'
                        ? (val ? 'Sim' : 'Não')
                        : field?.type === 'DATE' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
                          ? raw.split('-').reverse().join('/')
                          : raw;
                    return (
                      <div key={key}>
                        <p className="text-xs font-medium text-gray-500">{label}</p>
                        <p className="text-sm text-gray-800">{display}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex justify-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
}
