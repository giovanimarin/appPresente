'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationsApi } from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  ABSENCE: 'Justificativa de Falta',
  MEDICAL_CERT: 'Atestado Médico',
  EARLY_DEPARTURE: 'Saída Antecipada',
};
const TYPE_COLORS: Record<string, string> = {
  ABSENCE: '#f59e0b',
  MEDICAL_CERT: '#10b981',
  EARLY_DEPARTURE: '#0ea5e9',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SENT: { label: 'Enviado', color: '#6366f1', icon: Clock },
  RECEIVED: { label: 'Recebido', color: '#0ea5e9', icon: CheckCircle2 },
  UNDER_REVIEW: { label: 'Em análise', color: '#f59e0b', icon: AlertCircle },
  RESOLVED: { label: 'Resolvido', color: '#10b981', icon: CheckCircle2 },
};

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  SENT: { next: 'RECEIVED', label: 'Marcar como recebido' },
  RECEIVED: { next: 'UNDER_REVIEW', label: 'Colocar em análise' },
  UNDER_REVIEW: { next: 'RESOLVED', label: 'Resolver' },
};

type Request = {
  id: string;
  title: string;
  body: string;
  guardianType: string;
  guardianStatus: string;
  protocolNumber?: string;
  internalNote?: string;
  createdAt: string;
  guardian?: { id: string; name: string; phone: string; email?: string };
  commStudents: { student?: { id: string; name: string } }[];
};

export default function GuardianRequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['guardian-requests', { page, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      communicationsApi.listRequests({
        page,
        limit: 20,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      }).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      communicationsApi.updateRequestStatus(id, { status, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-requests'] }),
  });

  const requests: Request[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pedidos de Responsáveis</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} pedido{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {(statusFilter || typeFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhum pedido encontrado</p>
          </div>
        ) : (
          requests.map((req) => {
            const cfg = STATUS_CONFIG[req.guardianStatus] ?? STATUS_CONFIG.SENT;
            const StatusIcon = cfg.icon;
            const typeColor = TYPE_COLORS[req.guardianType] ?? '#6366f1';
            const isExpanded = expandedId === req.id;
            const students = req.commStudents?.map((cs) => cs.student?.name).filter(Boolean).join(', ');
            const nextAction = STATUS_FLOW[req.guardianStatus];

            return (
              <div key={req.id} className="overflow-hidden">
                {/* Linha resumida */}
                <button
                  className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors focus:outline-none"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${typeColor}18`, color: typeColor }}
                        >
                          {TYPE_LABELS[req.guardianType] ?? req.guardianType}
                        </span>
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                        {req.protocolNumber && (
                          <span className="text-xs font-mono text-gray-400">#{req.protocolNumber}</span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 truncate">{req.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {req.guardian && <span>{req.guardian.name}</span>}
                        {students && <span>· {students}</span>}
                        <span>· {formatDateTime(req.createdAt)}</span>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} className="text-gray-300 flex-shrink-0" />
                      : <ChevronDown size={16} className="text-gray-300 flex-shrink-0" />
                    }
                  </div>
                </button>

                {/* Painel expandido */}
                {isExpanded && (
                  <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100 space-y-4">
                    {/* Dados do responsável */}
                    {req.guardian && (
                      <div className="flex items-start gap-4 pt-4">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-semibold text-sm">{req.guardian.name[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{req.guardian.name}</p>
                          <p className="text-xs text-gray-500">{req.guardian.phone}</p>
                          {req.guardian.email && <p className="text-xs text-gray-500">{req.guardian.email}</p>}
                          {students && <p className="text-xs text-gray-500 mt-0.5">Aluno(s): {students}</p>}
                        </div>
                      </div>
                    )}

                    {/* Mensagem */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">{req.title}</p>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{req.body}</p>
                    </div>

                    {/* Nota interna existente */}
                    {req.internalNote && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Nota interna</p>
                        <p className="text-sm text-yellow-800">{req.internalNote}</p>
                      </div>
                    )}

                    {/* Ações de status */}
                    {nextAction && (
                      <div className="space-y-2">
                        {nextAction.next === 'RESOLVED' && (
                          <textarea
                            value={noteMap[req.id] ?? ''}
                            onChange={(e) => setNoteMap((m) => ({ ...m, [req.id]: e.target.value }))}
                            placeholder="Nota interna (opcional)..."
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          />
                        )}
                        <button
                          onClick={() =>
                            statusMutation.mutate({
                              id: req.id,
                              status: nextAction.next,
                              note: noteMap[req.id],
                            })
                          }
                          disabled={statusMutation.isPending}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50',
                            nextAction.next === 'RESOLVED'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-primary-600 hover:bg-primary-700',
                          )}
                        >
                          {statusMutation.isPending ? 'Salvando...' : nextAction.label}
                        </button>
                      </div>
                    )}

                    {req.guardianStatus === 'RESOLVED' && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Pedido resolvido
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Anterior</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  );
}
