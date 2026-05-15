'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { communicationsApi } from '@/lib/api';
import { formatDateTime, commTypeLabel, commTypeColor, cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import { Plus, Send, X, Loader2, Download, Inbox, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

async function exportReadReport(commId: string, commTitle: string) {
  const res = await communicationsApi.readReport(commId);
  const report = res.data as {
    title?: string;
    readRate?: number;
    recipients?: { guardianName: string; studentName: string; read: boolean; readAt?: string; deviceType?: string }[];
  };
  const rows = [
    ['Responsável', 'Aluno', 'Lido', 'Data/Hora', 'Dispositivo'],
    ...(report.recipients ?? []).map((r) => [
      r.guardianName,
      r.studentName,
      r.read ? 'Sim' : 'Não',
      r.readAt ? new Date(r.readAt).toLocaleString('pt-BR') : '—',
      r.deviceType ?? '—',
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leituras_${commTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  SENT: 'Enviado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  SENT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function CommunicationsPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId') ?? undefined;
  const studentId = searchParams.get('studentId') ?? undefined;
  const contextLabel = searchParams.get('label') ?? undefined;

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  useEffect(() => { setUserRole(getUser()?.role ?? null); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['communications', { page, status: statusFilter, classId, studentId }],
    queryFn: () =>
      communicationsApi.list({ page, limit: 20, status: statusFilter || undefined, classId, studentId }).then((r) => r.data),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => communicationsApi.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => communicationsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(classId || studentId) && (
            <Link href="/dashboard/communications" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={18} />
            </Link>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Comunicados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {contextLabel && <span className="font-medium text-primary-600">{contextLabel} · </span>}
              {data?.total ?? 0} comunicado{(data?.total ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole !== 'TEACHER' && (
            <Link
              href="/dashboard/communications/requests"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Inbox size={16} />
              Pedidos
            </Link>
          )}
          <a
            href="/dashboard/communications/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            Novo comunicado
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SENT', 'SCHEDULED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300',
            )}
          >
            {s === '' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum comunicado encontrado</p>
          </div>
        ) : (
          data?.data?.map((comm: {
            id: string;
            title: string;
            schoolType: string;
            schoolStatus: string;
            sentAt?: string;
            createdAt: string;
            author?: { name: string };
            _count: { reads: number };
            commClasses: { class: { name: string } }[];
          }) => (
            <div key={comm.id} className="flex items-center gap-4 hover:bg-gray-50/60 transition-colors">
              <Link href={`/dashboard/communications/${comm.id}`} className="flex-1 min-w-0 px-5 py-4 cursor-pointer">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', commTypeColor(comm.schoolType))}>
                    {commTypeLabel(comm.schoolType)}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[comm.schoolStatus])}>
                    {STATUS_LABELS[comm.schoolStatus]}
                  </span>
                </div>
                <p className="font-medium text-gray-900 truncate">{comm.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {comm.author && <span>por {comm.author.name}</span>}
                  <span>{formatDateTime(comm.sentAt ?? comm.createdAt)}</span>
                  {comm.commClasses?.length > 0 && (
                    <span>{comm.commClasses.map((cc) => cc.class.name).join(', ')}</span>
                  )}
                  {comm.schoolStatus === 'SENT' && (
                    <span>{comm._count.reads} leitura{comm._count.reads !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 pr-4">
                {comm.schoolStatus === 'SENT' && (
                  <button
                    onClick={() => exportReadReport(comm.id, comm.title)}
                    className="p-1.5 text-blue-400 hover:text-blue-700 rounded-lg hover:bg-blue-50"
                    title="Exportar relatório de leitura (CSV)"
                  >
                    <Download size={16} />
                  </button>
                )}
                {comm.schoolStatus === 'DRAFT' && (
                  <button
                    onClick={() => sendMutation.mutate(comm.id)}
                    disabled={sendMutation.isPending}
                    className="p-1.5 text-green-600 hover:text-green-800 rounded-lg hover:bg-green-50"
                    title="Enviar agora"
                  >
                    <Send size={16} />
                  </button>
                )}
                {comm.schoolStatus !== 'CANCELLED' && (
                  <button
                    onClick={() => cancelMutation.mutate(comm.id)}
                    disabled={cancelMutation.isPending}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            {page} / {Math.ceil((data?.total ?? 0) / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil((data?.total ?? 0) / 20)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
