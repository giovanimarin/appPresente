'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Plus, FileText, Loader2, Search, Trash2, Wand2 } from 'lucide-react';

type Form = { id: string; title: string; description?: string; status: string; createdAt: string; expiresAt?: string; _count: { submissions: number } };

const FORM_TEMPLATES = [
  {
    key: 'absence',
    title: 'Justificativa de Falta',
    description: 'Formulário para responsáveis justificarem a ausência do aluno.',
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-500',
    fields: [
      { type: 'DATE', label: 'Data da falta', required: true, options: [], placeholder: '' },
      { type: 'SELECT', label: 'Motivo', required: true, options: ['Doença', 'Consulta médica', 'Viagem', 'Compromisso familiar', 'Outro'], placeholder: '' },
      { type: 'TEXTAREA', label: 'Observações adicionais', required: false, options: [], placeholder: 'Descreva se necessário...' },
      { type: 'FILE', label: 'Documento comprobatório (foto ou PDF)', required: false, options: [], placeholder: '' },
    ],
  },
  {
    key: 'medical_cert',
    title: 'Entrega de Atestado Médico',
    description: 'Registro de entrega de atestado para justificar falta.',
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
    fields: [
      { type: 'DATE', label: 'Data da consulta', required: true, options: [], placeholder: '' },
      { type: 'TEXT', label: 'Médico / Especialidade', required: false, options: [], placeholder: 'Ex: Dr. João — Pediatria' },
      { type: 'TEXTAREA', label: 'Observações', required: false, options: [], placeholder: 'Informações adicionais...' },
      { type: 'FILE', label: 'Atestado médico (foto ou PDF)', required: true, options: [], placeholder: '' },
    ],
  },
  {
    key: 'early_departure',
    title: 'Autorização de Saída Antecipada',
    description: 'Solicitar autorização para retirar o aluno antes do horário.',
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-500',
    fields: [
      { type: 'DATE', label: 'Data', required: true, options: [], placeholder: '' },
      { type: 'TEXT', label: 'Horário de saída', required: true, options: [], placeholder: 'Ex: 14:30' },
      { type: 'SELECT', label: 'Motivo', required: true, options: ['Consulta médica', 'Compromisso familiar', 'Outro'], placeholder: '' },
      { type: 'TEXT', label: 'Quem irá buscar', required: true, options: [], placeholder: 'Nome completo' },
      { type: 'TEXTAREA', label: 'Observações', required: false, options: [], placeholder: 'Informações adicionais...' },
    ],
  },
] as const;

export default function FormsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['forms', { status: statusFilter }],
    queryFn: () => formsApi.list({ limit: 50, status: statusFilter || undefined }).then((r) => r.data),
  });

  const filtered = useMemo(() => {
    if (!search) return data?.data ?? [];
    return (data?.data ?? []).filter((f: Form) => f.title.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => formsApi.deletePermanent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); setConfirmDeleteId(null); },
  });

  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  function uid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  async function createFromTemplate(tpl: typeof FORM_TEMPLATES[number]) {
    setCreatingTemplate(tpl.key);
    try {
      await formsApi.create({
        title: tpl.title,
        description: tpl.description,
        fields: tpl.fields.map((f) => ({ ...f, id: uid() })),
      });
      await qc.invalidateQueries({ queryKey: ['forms'] });
    } finally {
      setCreatingTemplate(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Formulários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Formulários estruturados para responsáveis</p>
        </div>
        <a href="/dashboard/forms/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> Novo formulário
        </a>
      </div>

      {/* Templates — só mostra os que ainda não foram criados */}
      {(() => {
        const existingTitles = new Set((data?.data ?? []).map((f: Form) => f.title.toLowerCase()));
        const remaining = FORM_TEMPLATES.filter((t) => !existingTitles.has(t.title.toLowerCase()));
        if (remaining.length === 0) return null;
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={14} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Formulários pré-definidos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {remaining.map((tpl) => (
                <div key={tpl.key} className={cn('border rounded-xl p-4 flex flex-col gap-2', tpl.color)}>
                  <div className="flex items-start justify-between">
                    <FileText size={16} className={tpl.iconColor} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tpl.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                  </div>
                  <button
                    onClick={() => createFromTemplate(tpl)}
                    disabled={creatingTemplate === tpl.key}
                    className="mt-auto text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-700 disabled:opacity-60 transition-colors"
                  >
                    {creatingTemplate === tpl.key ? 'Criando...' : 'Criar formulário'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </div>
        {['', 'OPEN', 'CLOSED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300')}>
            {s === '' ? 'Todos' : s === 'OPEN' ? 'Abertos' : 'Fechados'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((form: Form) => (
            <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all relative group">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {confirmDeleteId === form.id ? (
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <button onClick={() => deleteMut.mutate(form.id)} disabled={deleteMut.isPending} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">{deleteMut.isPending ? '...' : 'Excluir'}</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 text-gray-500 text-xs">Não</button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.preventDefault(); setConfirmDeleteId(form.id); }} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Excluir permanente">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <a href={`/dashboard/forms/${form.id}`} className="block">
                <div className="flex items-start justify-between mb-3 pr-6">
                  <div className="p-2 bg-primary-50 rounded-lg"><FileText size={18} className="text-primary-600" /></div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', form.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                    {form.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{form.title}</h3>
                {form.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{form.description}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{form._count.submissions} submiss{form._count.submissions !== 1 ? 'ões' : 'ão'}</span>
                  {form.expiresAt && <span>Expira {formatDate(form.expiresAt)}</span>}
                </div>
              </a>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Nenhum formulário encontrado</div>}
        </div>
      )}
    </div>
  );
}
