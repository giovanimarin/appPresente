'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import ActionMenu from '@/components/ActionMenu';
import { cn } from '@/lib/utils';
import { Plus, Loader2, UserCircle, Search, Phone, Mail } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', SECRETARY: 'Secretária',
  COORDINATOR: 'Coordenador', TEACHER: 'Professor',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  SECRETARY: 'bg-purple-100 text-purple-700 border-purple-200',
  COORDINATOR: 'bg-blue-100 text-blue-700 border-blue-200',
  TEACHER: 'bg-green-100 text-green-700 border-green-200',
};

type User = { id: string; name: string; email: string; role: string; active: boolean; phone?: string };

export default function UsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', showInactive],
    queryFn: () => usersApi.list({ limit: 200, includeInactive: showInactive }).then((r) => r.data),
  });

  const filtered = useMemo(() => {
    let rows: User[] = data?.data ?? [];
    if (search) rows = rows.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone ?? '').includes(search),
    );
    if (roleFilter) rows = rows.filter((u) => u.role === roleFilter);
    return rows;
  }, [data, search, roleFilter]);

  const deactivateMut = useMutation({ mutationFn: (id: string) => usersApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const reactivateMut = useMutation({ mutationFn: (id: string) => usersApi.reactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => usersApi.deletePermanent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} membro{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="/dashboard/users/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          <Plus size={16} /> Novo usuário
        </a>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="">Todos os perfis</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none px-3 py-2 border border-gray-200 rounded-lg bg-white">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Ver desativados
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum usuário encontrado</div>
        ) : filtered.map((user) => (
          <div
            key={user.id}
            className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}
          >
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', user.active ? 'bg-gray-100' : 'bg-gray-50')}>
              <UserCircle size={20} className={user.active ? 'text-gray-400' : 'text-gray-300'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn('font-medium text-sm', user.active ? 'text-gray-900' : 'text-gray-400')}>{user.name}</p>
                {!user.active && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Desativado</span>}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><Mail size={11} />{user.email}</span>
                {user.phone && <span className="flex items-center gap-1"><Phone size={11} />{user.phone}</span>}
              </div>
            </div>
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium border', ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role] ?? user.role}</span>
            <div onClick={(e) => e.stopPropagation()}>
              <ActionMenu
                isActive={user.active}
                onEdit={() => router.push(`/dashboard/users/${user.id}/edit`)}
                onArchive={() => deactivateMut.mutate(user.id)}
                onReactivate={() => reactivateMut.mutate(user.id)}
                onDelete={() => deleteMut.mutate(user.id)}
                archivePending={deactivateMut.isPending}
                deletePending={deleteMut.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
