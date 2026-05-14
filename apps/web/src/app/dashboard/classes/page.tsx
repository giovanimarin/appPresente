'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { classesApi } from '@/lib/api';
import ActionMenu from '@/components/ActionMenu';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import { Plus, Loader2, Users, Upload, Search, DoorOpen } from 'lucide-react';

const SHIFT_LABELS: Record<string, string> = {
  MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
  // legado (migração dos valores antigos)
  manha: 'Manhã', tarde: 'Tarde', integral: 'Integral', noturno: 'Noturno',
};

type Class = { id: string; name: string; grade?: string; shift?: string; year?: number; active: boolean; _count?: { students: number }; roomRel?: { id: string; name: string } | null };

export default function ClassesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const isTeacher = getUser()?.role === 'TEACHER';
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['classes', showInactive],
    queryFn: () => classesApi.list({ limit: 200, includeInactive: showInactive }).then((r) => r.data),
  });

  const filtered = useMemo(() => {
    let rows: Class[] = data?.data ?? [];
    if (search) rows = rows.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.grade?.toLowerCase().includes(search.toLowerCase()));
    if (shiftFilter) rows = rows.filter((c) => c.shift === shiftFilter);
    return rows;
  }, [data, search, shiftFilter]);

  const archiveMut = useMutation({ mutationFn: (id: string) => classesApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });
  const reactivateMut = useMutation({ mutationFn: (id: string) => classesApi.reactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => classesApi.deletePermanent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Turmas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} turma{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-2">
            <Link href="/dashboard/students/import" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Upload size={16} /> Importar CSV
            </Link>
            <a href="/dashboard/classes/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              <Plus size={16} /> Nova turma
            </a>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou série..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </div>
        <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="">Todos os turnos</option>
          <option value="MATUTINO">Matutino</option>
          <option value="VESPERTINO">Vespertino</option>
          <option value="NOTURNO">Noturno</option>
          <option value="INTEGRAL">Integral</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none px-3 py-2 border border-gray-200 rounded-lg bg-white">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Ver desativadas
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">Nenhuma turma encontrada</div>
        ) : filtered.map((cls) => (
          <div key={cls.id} className={cn('bg-white rounded-xl border border-gray-200 p-5 relative', !cls.active && 'opacity-60')}>
            {!isTeacher && (
              <div className="absolute top-3 right-3">
                <ActionMenu
                  isActive={cls.active}
                  onEdit={() => router.push(`/dashboard/classes/${cls.id}/edit`)}
                  onArchive={() => archiveMut.mutate(cls.id)}
                  onReactivate={() => reactivateMut.mutate(cls.id)}
                  onDelete={() => deleteMut.mutate(cls.id)}
                  archivePending={archiveMut.isPending}
                  deletePending={deleteMut.isPending}
                />
              </div>
            )}
            <a href={`/dashboard/classes/${cls.id}`} className="block">
              <div className="flex items-start gap-3 mb-3 pr-8">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Users size={18} className="text-primary-600" />
                </div>
                {!cls.active && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Desativada</span>}
              </div>
              <h3 className="font-semibold text-gray-900">{cls.name}</h3>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                {cls.grade && <span>{cls.grade}</span>}
                {cls.shift && <span>{SHIFT_LABELS[cls.shift] ?? cls.shift}</span>}
                {cls.year && <span>{cls.year}</span>}
              </div>
              <div className="flex items-center justify-between mt-2">
                {cls._count !== undefined && (
                  <p className="text-xs text-gray-400">{cls._count.students} aluno{cls._count.students !== 1 ? 's' : ''}</p>
                )}
                {cls.roomRel && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <DoorOpen size={12} className="text-gray-400" />
                    {cls.roomRel.name}
                  </span>
                )}
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
