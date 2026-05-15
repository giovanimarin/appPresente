'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { studentsApi, classesApi } from '@/lib/api';
import ActionMenu from '@/components/ActionMenu';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import { Plus, Loader2, Search, Upload, UserCheck, UserX, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import ClassCombobox from '@/components/ClassCombobox';

type Student = {
  id: string; name: string; enrollmentCode?: string; active: boolean;
  class?: { id: string; name: string; grade?: string };
  _count?: { studentGuardians: number };
};

export default function StudentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const isTeacher = getUser()?.role === 'TEACHER';
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [guardianFilter, setGuardianFilter] = useState(''); // '' | 'with' | 'without'
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['students', showInactive],
    queryFn: () => studentsApi.list({ limit: 500, includeInactive: showInactive }).then((r) => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes', false],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
  });

  const filtered = useMemo(() => {
    let rows: Student[] = data?.data ?? [];
    if (search) rows = rows.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.enrollmentCode?.toLowerCase().includes(search.toLowerCase()));
    if (classFilter === '__none__') rows = rows.filter((s) => !s.class);
    else if (classFilter) rows = rows.filter((s) => s.class?.id === classFilter);
    if (guardianFilter === 'with') rows = rows.filter((s) => (s._count?.studentGuardians ?? 0) > 0);
    if (guardianFilter === 'without') rows = rows.filter((s) => (s._count?.studentGuardians ?? 0) === 0);
    return rows;
  }, [data, search, classFilter]);

  const archiveMut = useMutation({ mutationFn: (id: string) => studentsApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
  const reactivateMut = useMutation({ mutationFn: (id: string) => studentsApi.reactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => studentsApi.deletePermanent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alunos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} aluno{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-2">
            <Link href="/dashboard/students/import" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Upload size={16} /> Importar CSV
            </Link>
            <a href="/dashboard/students/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              <Plus size={16} /> Novo aluno
            </a>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </div>
        <div className="w-56">
          <ClassCombobox
            options={[{ id: '__none__', name: 'Sem turma' }, ...(classesData?.data ?? [])]}
            value={classFilter}
            onChange={setClassFilter}
            placeholder="Todas as turmas"
            emptyLabel="Todas as turmas"
          />
        </div>
        <select value={guardianFilter} onChange={(e) => setGuardianFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
          <option value="">Todos os alunos</option>
          <option value="with">Com responsável</option>
          <option value="without">Sem responsável</option>
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
          <div className="text-center py-12 text-gray-400">Nenhum aluno encontrado</div>
        ) : filtered.map((student) => (
          <div key={student.id} className="px-5 py-4 flex items-center gap-4">
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0', student.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400')}>
              {student.name[0].toUpperCase()}
            </div>
            <Link href={`/dashboard/students/${student.id}`} className="flex-1 min-w-0 hover:underline decoration-gray-300">
              <div className="flex items-center gap-2">
                <p className={cn('font-medium text-sm truncate', student.active ? 'text-gray-900' : 'text-gray-400')}>{student.name}</p>
                {!student.active && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Desativado</span>}
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                {student.class && <span>{student.class.name}{student.class.grade ? ` · ${student.class.grade}` : ''}</span>}
                {student.enrollmentCode && <span>Mat: {student.enrollmentCode}</span>}
              </div>
            </Link>
            {(student._count?.studentGuardians ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                <UserCheck size={12} /> {student._count!.studentGuardians} resp.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-400 flex-shrink-0">
                <UserX size={12} /> Sem resp.
              </span>
            )}
            <Link
              href={`/dashboard/communications?studentId=${student.id}&label=${encodeURIComponent(student.name)}`}
              className="p-1.5 text-gray-300 hover:text-primary-500 rounded-lg hover:bg-primary-50 transition-colors flex-shrink-0"
              title="Ver comunicados deste aluno"
            >
              <MessageSquare size={15} />
            </Link>
            {!isTeacher && (
              <ActionMenu
                isActive={student.active}
                onEdit={() => router.push(`/dashboard/students/${student.id}/edit`)}
                onArchive={() => archiveMut.mutate(student.id)}
                onReactivate={() => reactivateMut.mutate(student.id)}
                onDelete={() => deleteMut.mutate(student.id)}
                archivePending={archiveMut.isPending}
                deletePending={deleteMut.isPending}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
