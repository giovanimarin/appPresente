'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi, classesApi } from '@/lib/api';
import ActionMenu from '@/components/ActionMenu';
import { cn } from '@/lib/utils';
import { Plus, Loader2, UserCircle, Search, List, Network } from 'lucide-react';
import Link from 'next/link';

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
type ClassTeacherEntry = { teacher: { id: string; name: string }; subject?: string; isHomeroom: boolean };
type ClassItem = {
  id: string; name: string; grade?: string; active: boolean;
  coordinator?: { id: string; name: string } | null;
  classTeachers: ClassTeacherEntry[];
  _count: { students: number };
};

// ── Org chart node ───────────────────────────────────────────────────────────

function OrgNode({ label, sub, role, onClick }: { label: string; sub?: string; role: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex flex-col items-center px-4 py-2.5 rounded-xl border-2 text-center min-w-[120px] max-w-[160px] shadow-sm',
        ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700 border-gray-200',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
      )}
    >
      <span className="text-sm font-semibold leading-tight">{label}</span>
      {sub && <span className="text-xs opacity-70 mt-0.5 truncate w-full text-center">{sub}</span>}
    </div>
  );
}

function ClassNode({ cls }: { cls: ClassItem }) {
  return (
    <Link href={`/dashboard/classes/${cls.id}`}>
      <div className="inline-flex flex-col items-center px-3 py-2 rounded-xl border-2 border-gray-200 bg-white text-center min-w-[100px] max-w-[140px] shadow-sm hover:border-primary-400 hover:shadow-md transition-all cursor-pointer">
        <span className="text-xs font-semibold text-gray-800 leading-tight">{cls.name}</span>
        {cls.grade && <span className="text-[10px] text-gray-400 mt-0.5">{cls.grade}</span>}
        <span className="text-[10px] text-gray-400">{cls._count.students} aluno{cls._count.students !== 1 ? 's' : ''}</span>
      </div>
    </Link>
  );
}

// ── Vertical tree connector ──────────────────────────────────────────────────

function Children({ items }: { items: React.ReactNode[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-0">
      {/* vertical line down */}
      <div className="w-px h-5 bg-gray-300" />
      {items.length > 1 ? (
        <div className="flex flex-col items-center gap-0">
          {/* horizontal bar */}
          <div className="relative flex items-start justify-center gap-8">
            {/* top horizontal line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gray-300" style={{ marginLeft: '50%', marginRight: '50%', left: `calc(50% - ${(items.length - 1) * 4}rem / 2)`, right: `calc(50% - ${(items.length - 1) * 4}rem / 2)` }} />
            {items.map((child, i) => (
              <div key={i} className="flex flex-col items-center gap-0">
                <div className="w-px h-5 bg-gray-300" />
                {child}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {items[0]}
        </div>
      )}
    </div>
  );
}

// ── Proper tree with real connector lines ────────────────────────────────────

function TreeLevel({ nodes }: { nodes: React.ReactNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-5 bg-gray-300" />
      <div className="relative flex gap-6 items-start">
        {nodes.length > 1 && (
          <div
            className="absolute top-0 h-px bg-gray-300"
            style={{ left: 'calc(50% / ' + nodes.length + ')', right: 'calc(50% / ' + nodes.length + ')' }}
          />
        )}
        {nodes.map((node, i) => (
          <div key={i} className="flex flex-col items-center">
            {nodes.length > 1 && <div className="w-px h-5 bg-gray-300" />}
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgChart({ users, classes }: { users: User[]; classes: ClassItem[] }) {
  const admins = users.filter(u => u.role === 'ADMIN' && u.active);
  const coordinators = users.filter(u => u.role === 'COORDINATOR' && u.active);
  const teachers = users.filter(u => u.role === 'TEACHER' && u.active);
  const activeClasses = classes.filter(c => c.active);

  // Map coordinator → their classes
  const coordClasses = new Map<string, ClassItem[]>();
  for (const cls of activeClasses) {
    if (cls.coordinator?.id) {
      if (!coordClasses.has(cls.coordinator.id)) coordClasses.set(cls.coordinator.id, []);
      coordClasses.get(cls.coordinator.id)!.push(cls);
    }
  }

  // Map teacher → their classes
  const teacherClasses = new Map<string, ClassItem[]>();
  for (const cls of activeClasses) {
    for (const ct of cls.classTeachers) {
      if (!teacherClasses.has(ct.teacher.id)) teacherClasses.set(ct.teacher.id, []);
      teacherClasses.get(ct.teacher.id)!.push(cls);
    }
  }

  // Teachers grouped by coordinator: those who teach in a coordinator's classes
  const coordTeachers = new Map<string, User[]>();
  for (const coord of coordinators) {
    const cClasses = coordClasses.get(coord.id) ?? [];
    const cClassIds = new Set(cClasses.map(c => c.id));
    const tSet = new Set<string>();
    const tList: User[] = [];
    for (const cls of activeClasses) {
      if (!cClassIds.has(cls.id)) continue;
      for (const ct of cls.classTeachers) {
        const teacher = teachers.find(t => t.id === ct.teacher.id);
        if (teacher && !tSet.has(teacher.id)) { tSet.add(teacher.id); tList.push(teacher); }
      }
    }
    coordTeachers.set(coord.id, tList);
  }

  // Teachers not under any coordinator
  const linkedTeacherIds = new Set([...coordTeachers.values()].flat().map(t => t.id));
  const unlinkedTeachers = teachers.filter(t => !linkedTeacherIds.has(t.id));
  const unlinkedClasses = activeClasses.filter(c => !c.coordinator?.id && c.classTeachers.length === 0);

  return (
    <div className="overflow-x-auto pb-8">
      <div className="inline-flex flex-col items-center min-w-full pt-6">

        {/* ADMINS */}
        <div className="flex gap-6">
          {admins.length === 0
            ? <OrgNode label="Sem administrador" role="ADMIN" />
            : admins.map(a => <OrgNode key={a.id} label={a.name} sub="Administrador" role="ADMIN" />)
          }
        </div>

        {/* vertical + horizontal lines to coordinators+unlinked teachers */}
        {(coordinators.length > 0 || unlinkedTeachers.length > 0 || unlinkedClasses.length > 0) && (
          <>
            <div className="w-px h-6 bg-gray-300" />

            {/* COORDINATORS row */}
            {coordinators.length > 0 && (
              <>
                <div className="relative flex gap-8 items-start">
                  {coordinators.length > 1 && (
                    <div className="absolute top-0 h-px bg-gray-300" style={{ left: '24px', right: '24px' }} />
                  )}
                  {coordinators.map(coord => {
                    const cTeachers = coordTeachers.get(coord.id) ?? [];
                    const cClasses = coordClasses.get(coord.id) ?? [];
                    return (
                      <div key={coord.id} className="flex flex-col items-center gap-0">
                        {coordinators.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                        <OrgNode label={coord.name} sub="Coordenador" role="COORDINATOR" />

                        {/* Teachers under this coordinator */}
                        {cTeachers.length > 0 && (
                          <>
                            <div className="w-px h-5 bg-gray-300" />
                            <div className="relative flex gap-6 items-start">
                              {cTeachers.length > 1 && (
                                <div className="absolute top-0 h-px bg-gray-300" style={{ left: '20px', right: '20px' }} />
                              )}
                              {cTeachers.map(teacher => {
                                const tClasses = teacherClasses.get(teacher.id) ?? [];
                                return (
                                  <div key={teacher.id} className="flex flex-col items-center gap-0">
                                    {cTeachers.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                                    <OrgNode label={teacher.name} sub="Professor" role="TEACHER" />
                                    {tClasses.length > 0 && (
                                      <>
                                        <div className="w-px h-5 bg-gray-300" />
                                        <div className="relative flex gap-4 items-start">
                                          {tClasses.length > 1 && (
                                            <div className="absolute top-0 h-px bg-gray-300" style={{ left: '16px', right: '16px' }} />
                                          )}
                                          {tClasses.map(cls => (
                                            <div key={cls.id} className="flex flex-col items-center">
                                              {tClasses.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                                              <ClassNode cls={cls} />
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* Classes directly under coordinator (no teacher) */}
                        {cClasses.filter(c => c.classTeachers.length === 0).length > 0 && (
                          <>
                            <div className="w-px h-5 bg-gray-300" />
                            <div className="relative flex gap-4 items-start">
                              {cClasses.filter(c => c.classTeachers.length === 0).length > 1 && (
                                <div className="absolute top-0 h-px bg-gray-300" style={{ left: '16px', right: '16px' }} />
                              )}
                              {cClasses.filter(c => c.classTeachers.length === 0).map(cls => (
                                <div key={cls.id} className="flex flex-col items-center">
                                  {cClasses.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                                  <ClassNode cls={cls} />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Unlinked teachers (no coordinator) */}
            {unlinkedTeachers.length > 0 && (
              <>
                {coordinators.length > 0 && <div className="w-px h-6 bg-gray-300" />}
                <div className="relative flex gap-6 items-start">
                  {unlinkedTeachers.length > 1 && (
                    <div className="absolute top-0 h-px bg-gray-300" style={{ left: '20px', right: '20px' }} />
                  )}
                  {unlinkedTeachers.map(teacher => {
                    const tClasses = teacherClasses.get(teacher.id) ?? [];
                    return (
                      <div key={teacher.id} className="flex flex-col items-center gap-0">
                        {unlinkedTeachers.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                        <OrgNode label={teacher.name} sub="Professor" role="TEACHER" />
                        {tClasses.length > 0 && (
                          <>
                            <div className="w-px h-5 bg-gray-300" />
                            <div className="relative flex gap-4 items-start">
                              {tClasses.length > 1 && (
                                <div className="absolute top-0 h-px bg-gray-300" style={{ left: '16px', right: '16px' }} />
                              )}
                              {tClasses.map(cls => (
                                <div key={cls.id} className="flex flex-col items-center">
                                  {tClasses.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                                  <ClassNode cls={cls} />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Classes with no coordinator and no teachers */}
            {unlinkedClasses.length > 0 && (
              <>
                <div className="w-px h-6 bg-gray-300" />
                <div className="relative flex gap-4 items-start">
                  {unlinkedClasses.length > 1 && (
                    <div className="absolute top-0 h-px bg-gray-300" style={{ left: '16px', right: '16px' }} />
                  )}
                  {unlinkedClasses.map(cls => (
                    <div key={cls.id} className="flex flex-col items-center">
                      {unlinkedClasses.length > 1 && <div className="w-px h-5 bg-gray-300" />}
                      <ClassNode cls={cls} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'org'>('list');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', showInactive],
    queryFn: () => usersApi.list({ limit: 200, includeInactive: showInactive }).then((r) => r.data),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', false],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
    enabled: view === 'org',
  });

  const filtered = useMemo(() => {
    let rows: User[] = data?.data ?? [];
    if (search) rows = rows.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter) rows = rows.filter((u) => u.role === roleFilter);
    return rows;
  }, [data, search, roleFilter]);

  const archiveMut = useMutation({ mutationFn: (id: string) => usersApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const reactivateMut = useMutation({ mutationFn: (id: string) => usersApi.reactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => usersApi.deletePermanent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Equipe</h1>
          {view === 'list' && <p className="text-sm text-gray-500 mt-0.5">{filtered.length} membro{filtered.length !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setView('list')} className={cn('px-3 py-2 text-sm flex items-center gap-1.5', view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
              <List size={14} /> Lista
            </button>
            <button onClick={() => setView('org')} className={cn('px-3 py-2 text-sm flex items-center gap-1.5 border-l border-gray-200', view === 'org' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
              <Network size={14} /> Organograma
            </button>
          </div>
          <a href="/dashboard/users/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus size={16} /> Novo usuário
          </a>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
              <option value="">Todos os perfis</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                  <div className="flex items-center gap-2">
                    <p className={cn('font-medium text-sm truncate', user.active ? 'text-gray-900' : 'text-gray-400')}>{user.name}</p>
                    {!user.active && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Arquivado</span>}
                  </div>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium border', ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role] ?? user.role}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    isActive={user.active}
                    onEdit={() => router.push(`/dashboard/users/${user.id}/edit`)}
                    onArchive={() => archiveMut.mutate(user.id)}
                    onReactivate={() => reactivateMut.mutate(user.id)}
                    onDelete={() => deleteMut.mutate(user.id)}
                    archivePending={archiveMut.isPending}
                    deletePending={deleteMut.isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── ORG CHART VIEW ────────────────────────────────────────────────── */}
      {view === 'org' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {isLoading || classesLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
          ) : (
            <OrgChart users={data?.data ?? []} classes={classesData?.data ?? []} />
          )}
        </div>
      )}
    </div>
  );
}
