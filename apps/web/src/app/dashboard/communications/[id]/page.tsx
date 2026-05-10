'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationsApi } from '@/lib/api';
import { cn, commTypeLabel, commTypeColor, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Send, X, Download, CheckCircle2, Clock, Loader2, Users, Bell, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', SCHEDULED: 'Agendado', SENT: 'Enviado', CANCELLED: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  SENT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

type Recipient = {
  guardianId: string; guardianName: string; guardianPhone: string;
  studentId: string; studentName: string;
  sentAt: string | null;
  receivedAt: string | null; viewedAt: string | null; readAt: string | null;
  deviceType?: string | null; ipAddress?: string | null;
};

type Report = {
  communication: {
    id: string; title: string; schoolType: string; schoolStatus: string;
    sentAt?: string; eventDate?: string; requiresConfirmation: boolean; scope: string;
    commClasses: { id: string; name: string }[];
  };
  stats: { total: number; receivedCount: number; viewedCount: number; confirmedCount: number };
  readRate: number; total: number;
  recipients: Recipient[];
};

function fmt(dt: string | null | undefined): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StageCell({ at }: { at: string | null | undefined }) {
  if (!at) return (
    <td className="px-4 py-3 text-center">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100">
        <span className="w-2 h-2 rounded-full bg-gray-300 block" />
      </span>
    </td>
  );
  return (
    <td className="px-4 py-3 text-center">
      <div className="flex flex-col items-center gap-0.5">
        <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
        <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(at)}</span>
      </div>
    </td>
  );
}

function exportCsv(report: Report) {
  const rows = [
    ['Responsável', 'Telefone', 'Aluno', 'Enviado', 'Recebido', 'Lido (abriu)', 'Confirmado', 'Dispositivo', 'IP (leitura)'],
    ...report.recipients.map((r) => [
      r.guardianName, r.guardianPhone, r.studentName,
      fmt(r.sentAt), fmt(r.receivedAt), fmt(r.viewedAt), fmt(r.readAt),
      r.deviceType ?? '—', r.ipAddress ?? '—',
    ]),
  ];
  const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_${report.communication.title.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type DeliverTarget = 'all' | 'student' | 'guardian';
type Channel = 'notification' | 'email';

export default function CommunicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // Deliver panel state
  const [showDeliver, setShowDeliver] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(['notification']);
  const [target, setTarget] = useState<DeliverTarget>('all');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [targetGuardianId, setTargetGuardianId] = useState('');
  const [deliverResult, setDeliverResult] = useState<{ targets: number; notifCount: number; emailSent: number; emailFailed: number } | null>(null);

  const { data: report, isLoading } = useQuery<Report>({
    queryKey: ['communication-report', id],
    queryFn: () => communicationsApi.readReport(id).then((r) => r.data),
    enabled: !!id,
  });

  const sendMut = useMutation({
    mutationFn: () => communicationsApi.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communication-report', id] }),
  });
  const cancelMut = useMutation({
    mutationFn: () => communicationsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communication-report', id] }),
  });
  const deliverMut = useMutation({
    mutationFn: () => communicationsApi.deliver(id, {
      channels,
      target,
      ...(target === 'student' ? { studentId: targetStudentId } : {}),
      ...(target === 'guardian' ? { guardianId: targetGuardianId } : {}),
    }),
    onSuccess: (res) => {
      const d = res.data as { targets: number; notifCount: number; emailSent: number; emailFailed: number };
      qc.invalidateQueries({ queryKey: ['communication-report', id] });
      setDeliverResult(d);
    },
  });

  function toggleChannel(c: Channel) {
    setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-primary-600" /></div>;
  if (!report) return <div className="text-gray-400 text-sm">Comunicado não encontrado.</div>;

  const { communication: comm, stats, readRate, recipients } = report;
  const isSent = comm.schoolStatus === 'SENT';
  const isDraft = comm.schoolStatus === 'DRAFT';

  // Unique students and guardians for targeting selects
  const uniqueStudents = [...new Map(recipients.map((r) => [r.studentId, { id: r.studentId, name: r.studentName }])).values()];
  const uniqueGuardians = [...new Map(recipients.map((r) => [r.guardianId, { id: r.guardianId, name: r.guardianName }])).values()];

  const canDeliver = channels.length > 0 && (
    target === 'all' ||
    (target === 'student' && targetStudentId) ||
    (target === 'guardian' && targetGuardianId)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', commTypeColor(comm.schoolType))}>
              {commTypeLabel(comm.schoolType)}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[comm.schoolStatus])}>
              {STATUS_LABELS[comm.schoolStatus]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 truncate">{comm.title}</h1>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
            {comm.sentAt && <span>Enviado em {formatDateTime(comm.sentAt)}</span>}
            {comm.eventDate && (
              <span className="text-indigo-600 font-medium">
                {comm.schoolType === 'EXAM' ? 'Prova' : 'Reunião'}: {new Date(comm.eventDate).toLocaleDateString('pt-BR')}
              </span>
            )}
            {comm.commClasses.length > 0 && <span>{comm.commClasses.map((c) => c.name).join(', ')}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isSent && (
            <>
              <button onClick={() => exportCsv(report)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600">
                <Download size={13} /> Exportar CSV
              </button>
              <button onClick={() => { setShowDeliver((v) => !v); setDeliverResult(null); deliverMut.reset(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50">
                <Bell size={13} /> Entregar
                {showDeliver ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </>
          )}
          {isDraft && (
            <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-60">
              <Send size={13} /> {sendMut.isPending ? 'Enviando...' : 'Enviar'}
            </button>
          )}
          {comm.schoolStatus !== 'CANCELLED' && (
            <button onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
              <X size={13} /> Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Deliver Panel */}
      {showDeliver && isSent && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-indigo-800">Entregar comunicado</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Canais */}
            <div>
              <label className="block text-xs font-medium text-indigo-700 mb-2">Canal</label>
              <div className="space-y-2">
                {([['notification', Bell, 'Notificação no app/web'], ['email', Mail, 'E-mail']] as const).map(([c, Icon, label]) => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)}
                      className="rounded accent-indigo-600" />
                    <Icon size={13} className="text-indigo-500" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Destino */}
            <div>
              <label className="block text-xs font-medium text-indigo-700 mb-2">Destinatário</label>
              <div className="space-y-1.5">
                {(['all', 'student', 'guardian'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="target" checked={target === t} onChange={() => setTarget(t)}
                      className="accent-indigo-600" />
                    <span className="text-sm text-gray-700">
                      {t === 'all' ? 'Todos os destinatários' : t === 'student' ? 'Por aluno' : 'Por responsável'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Select dinâmico */}
            <div>
              {target === 'student' && (
                <>
                  <label className="block text-xs font-medium text-indigo-700 mb-2">Aluno</label>
                  <SearchableSelect
                    options={uniqueStudents.map((s) => ({ id: s.id, label: s.name }))}
                    value={targetStudentId}
                    onChange={setTargetStudentId}
                  />
                  <p className="text-xs text-indigo-500 mt-1">Será entregue a todos os responsáveis deste aluno</p>
                </>
              )}
              {target === 'guardian' && (
                <>
                  <label className="block text-xs font-medium text-indigo-700 mb-2">Responsável</label>
                  <SearchableSelect
                    options={uniqueGuardians.map((g) => ({ id: g.id, label: g.name }))}
                    value={targetGuardianId}
                    onChange={setTargetGuardianId}
                  />
                </>
              )}
              {target === 'all' && (
                <div className="text-xs text-indigo-500 mt-6">
                  Será entregue para todos os {stats.total} responsável(is) do comunicado.
                </div>
              )}
            </div>
          </div>

          {deliverMut.isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                {(deliverMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao entregar'}
              </p>
            </div>
          )}

          {deliverResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-800 mb-1">Entrega realizada com sucesso</p>
              <div className="flex flex-wrap gap-3 text-xs text-green-700">
                <span>👥 {deliverResult.targets} responsável(is)</span>
                {deliverResult.notifCount > 0 && <span>🔔 {deliverResult.notifCount} notificação(ões) criada(s)</span>}
                {deliverResult.emailSent > 0 && <span>✉️ {deliverResult.emailSent} e-mail(s) enviado(s)</span>}
                {deliverResult.emailFailed > 0 && (
                  <span className="text-orange-600">⚠️ {deliverResult.emailFailed} sem e-mail cadastrado</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowDeliver(false); setDeliverResult(null); deliverMut.reset(); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Fechar</button>
            {!deliverResult && (
              <button onClick={() => deliverMut.mutate()} disabled={!canDeliver || deliverMut.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {deliverMut.isPending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Bell size={13} /> Entregar agora</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats cards */}
      {isSent && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Enviados', value: stats.total, icon: <Send size={16} className="text-gray-400" />, border: 'border-gray-200' },
            { label: 'Recebidos', value: stats.receivedCount, icon: <Users size={16} className="text-blue-400" />, border: 'border-blue-200' },
            { label: 'Lidos', value: stats.viewedCount, icon: <Clock size={16} className="text-indigo-400" />, border: 'border-indigo-200' },
            { label: 'Confirmados', value: stats.confirmedCount, icon: <CheckCircle2 size={16} className="text-green-500" />, border: 'border-green-200' },
          ].map((s) => (
            <div key={s.label} className={cn('bg-white rounded-xl border p-4 text-center', s.border)}>
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {isSent && comm.requiresConfirmation && stats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Taxa de confirmação</span>
            <span className="text-sm font-bold text-gray-900">{readRate}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', readRate === 100 ? 'bg-green-500' : 'bg-primary-500')}
              style={{ width: `${readRate}%` }} />
          </div>
        </div>
      )}

      {/* Audit table */}
      {isSent && recipients.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Auditoria de entrega</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cada evento registra data, hora, dispositivo e IP</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-[220px]">Responsável / Aluno</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Enviado</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Recebido</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Lido</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Confirmado</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Dispositivo / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recipients.map((r) => (
                  <tr key={`${r.guardianId}:${r.studentId}`} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{r.guardianName}</p>
                      <p className="text-xs text-gray-400">{r.studentName} · {r.guardianPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(r.sentAt)}</span>
                      </div>
                    </td>
                    <StageCell at={r.receivedAt} />
                    {r.viewedAt ? (
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 size={16} className="text-green-500" />
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(r.viewedAt)}</span>
                        </div>
                      </td>
                    ) : <StageCell at={null} />}
                    <StageCell at={r.readAt} />
                    <td className="px-4 py-3">
                      {(r.deviceType || r.ipAddress) ? (
                        <div>
                          {r.deviceType && <p className="text-xs text-gray-600">{r.deviceType}</p>}
                          {r.ipAddress && <p className="text-xs text-gray-400 font-mono">{r.ipAddress}</p>}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <Send size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">O comunicado ainda não foi enviado.</p>
          <p className="text-xs mt-1">Clique em "Enviar" para disparar para os responsáveis.</p>
        </div>
      )}
    </div>
  );
}
