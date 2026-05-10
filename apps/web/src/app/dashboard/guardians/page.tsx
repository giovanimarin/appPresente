'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardiansApi } from '@/lib/api';
import ActionMenu from '@/components/ActionMenu';
import { cn, formatPhone, maskPhone, formatCpf, maskCpf } from '@/lib/utils';
import { Loader2, RefreshCw, Search, Plus, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  activated: 'Ativo', pending: 'Pendente',
};

type Guardian = {
  id: string; name: string; phone: string; email?: string; cpf?: string; active: boolean; activatedAt?: string;
  studentGuardians: { student: { id: string; name: string } }[];
};

export default function GuardiansPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCpf, setNewCpf] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCpf, setEditCpf] = useState('');

  function openEdit(g: Guardian) {
    setEditId(g.id);
    setEditName(g.name || '');
    setEditPhone(maskPhone(g.phone || ''));
    setEditEmail(g.email || '');
    setEditCpf(g.cpf ? maskCpf(g.cpf) : '');
  }
  function closeEdit() { setEditId(null); }

  const { data, isLoading } = useQuery({
    queryKey: ['guardians', showInactive, statusFilter],
    queryFn: () => guardiansApi.list({ limit: 500, includeInactive: showInactive, status: statusFilter || undefined }).then((r) => r.data),
  });

  const filtered = useMemo(() => {
    let rows: Guardian[] = data?.data ?? [];
    if (search) rows = rows.filter((g) => g.name?.toLowerCase().includes(search.toLowerCase()) || g.phone?.includes(search) || g.email?.toLowerCase().includes(search.toLowerCase()));
    return rows;
  }, [data, search]);

  const createMut = useMutation({
    mutationFn: () => guardiansApi.create({ name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() || undefined, cpf: newCpf.replace(/\D/g, '') || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardians'] });
      setShowNew(false);
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewCpf('');
    },
  });

  const updateMut = useMutation({
    mutationFn: () => guardiansApi.update(editId!, {
      name: editName.trim(),
      phone: editPhone.replace(/\D/g, ''),
      email: editEmail.trim() || undefined,
      cpf: editCpf.replace(/\D/g, '') || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guardians'] }); closeEdit(); },
  });

  const resendMut = useMutation({ mutationFn: (id: string) => guardiansApi.resendInvite(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['guardians'] }) });
  const archiveMut = useMutation({ mutationFn: (id: string) => guardiansApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['guardians'] }) });
  const reactivateMut = useMutation({ mutationFn: (id: string) => guardiansApi.reactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['guardians'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => guardiansApi.deletePermanent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['guardians'] }) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Responsáveis</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} responsável{filtered.length !== 1 ? 'is' : ''}</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> Novo responsável
        </button>
      </div>

      {/* Formulário de criação */}
      {showNew && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Novo responsável</h2>
            <button onClick={() => { setShowNew(false); setNewName(''); setNewPhone(''); setNewEmail(''); }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
              <input value={newCpf} onChange={(e) => setNewCpf(maskCpf(e.target.value))} placeholder="000.000.000-00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone *</label>
              <input value={newPhone} onChange={(e) => setNewPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          </div>
          {createMut.isError && (
            <p className="text-xs text-red-600">{(createMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar responsável'}</p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowNew(false); setNewName(''); setNewPhone(''); setNewEmail(''); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={() => createMut.mutate()} disabled={!newPhone.trim() || createMut.isPending}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
              {createMut.isPending ? 'Criando...' : 'Criar responsável'}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none px-3 py-2 border border-gray-200 rounded-lg bg-white">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Ver arquivados
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum responsável encontrado</div>
        ) : filtered.map((g) => (
          <div key={g.id} className="px-5 py-4">
            {editId === g.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome completo"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                    <input value={editCpf} onChange={(e) => setEditCpf(maskCpf(e.target.value))} placeholder="000.000.000-00"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                </div>
                {updateMut.isError && (
                  <p className="text-xs text-red-600">{(updateMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao salvar'}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={closeEdit} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
                    className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                    {updateMut.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0', g.active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400')}>
                  {(g.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('font-medium text-sm truncate', g.active ? 'text-gray-900' : 'text-gray-400')}>
                      {g.name || <span className="italic text-gray-400">Sem nome</span>}
                    </p>
                    {!g.active && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Arquivado</span>}
                    {g.active && !g.activatedAt && <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Pendente</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatPhone(g.phone)}{g.cpf ? ` · CPF ${formatCpf(g.cpf)}` : ''}{g.email ? ` · ${g.email}` : ''}
                  </p>
                  {g.studentGuardians?.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {g.studentGuardians.map((sg, i) => (
                        <span key={sg.student.id}>
                          {i > 0 && ', '}
                          <Link href={`/dashboard/students/${sg.student.id}`} className="hover:text-primary-600 hover:underline">
                            {sg.student.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {g.active && !g.activatedAt && (
                    <button onClick={() => resendMut.mutate(g.id)} disabled={resendMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-primary-300 hover:text-primary-600">
                      <RefreshCw size={12} /> Reenviar
                    </button>
                  )}
                  <Link href={`/dashboard/guardians/${g.id}`}
                    className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50" title="Ver detalhes">
                    <ChevronRight size={16} />
                  </Link>
                  <ActionMenu
                    isActive={g.active}
                    onEdit={() => openEdit(g)}
                    onArchive={() => archiveMut.mutate(g.id)}
                    onReactivate={() => reactivateMut.mutate(g.id)}
                    onDelete={() => deleteMut.mutate(g.id)}
                    archivePending={archiveMut.isPending}
                    deletePending={deleteMut.isPending}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
