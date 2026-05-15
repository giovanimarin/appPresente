'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { guardiansApi, studentsApi, classesApi } from '@/lib/api';
import { ArrowLeft, Loader2, Pencil, Plus, X, Phone, Mail, Search, GraduationCap, UserCircle } from 'lucide-react';
import { formatPhone, maskPhone, formatCpf, maskCpf, cn } from '@/lib/utils';

const RELATIONSHIP_LABELS: Record<string, string> = {
  mae: 'Mãe', mãe: 'Mãe', pai: 'Pai', avo: 'Avô/Avó', avó: 'Avó', avô: 'Avô',
  tio: 'Tio', tia: 'Tia', responsavel: 'Responsável', responsável: 'Responsável', outro: 'Outro',
};

type StudentLink = {
  relationship: string;
  kinshipDegree?: string | null;
  status: string;
  student: { id: string; name: string; class: { id: string; name: string; grade: string } };
};

type StudentOption = { id: string; name: string; class?: { name: string; grade: string } };
type AddMode = 'existing' | 'new';

export default function GuardianDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCpf, setEditCpf] = useState('');

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('existing');

  // Vincular existente
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [kinshipDegree, setKinshipDegree] = useState('');

  // Criar novo aluno
  const [newName, setNewName] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newEnrollment, setNewEnrollment] = useState('');
  const [newKinship, setNewKinship] = useState('');

  const { data: guardian, isLoading } = useQuery({
    queryKey: ['guardian', params.id],
    queryFn: () => guardiansApi.get(params.id).then((r) => r.data),
  });

  const { data: allStudentsData } = useQuery({
    queryKey: ['students-for-link'],
    queryFn: () => studentsApi.list({ limit: 500 }).then((r) => r.data),
    enabled: showAddStudent && addMode === 'existing',
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
    enabled: showAddStudent && addMode === 'new',
  });
  const classes: { id: string; name: string; grade?: string }[] = classesData?.data ?? [];

  const linkedStudentIds = useMemo(
    () => new Set((guardian?.studentGuardians ?? []).map((sg: StudentLink) => sg.student.id)),
    [guardian],
  );

  const filteredStudents: StudentOption[] = useMemo(() => {
    const all: StudentOption[] = (allStudentsData?.data ?? []).filter((s: StudentOption) => !linkedStudentIds.has(s.id));
    if (!studentSearch.trim()) return all;
    const q = studentSearch.toLowerCase();
    return all.filter((s) => s.name?.toLowerCase().includes(q) || s.class?.name?.toLowerCase().includes(q) || s.class?.grade?.toLowerCase().includes(q));
  }, [allStudentsData, linkedStudentIds, studentSearch]);

  function openEdit() {
    setEditName(guardian?.name ?? '');
    setEditPhone(maskPhone(guardian?.phone ?? ''));
    setEditEmail(guardian?.email ?? '');
    setEditCpf(guardian?.cpf ? maskCpf(guardian.cpf) : '');
    setEditing(true);
  }

  function resetAddStudent() {
    setShowAddStudent(false);
    setAddMode('existing');
    setStudentSearch('');
    setSelectedStudent(null);
    setKinshipDegree('');
    setNewName('');
    setNewClassId('');
    setNewEnrollment('');
    setNewKinship('');
  }

  const updateMut = useMutation({
    mutationFn: () => guardiansApi.update(params.id, {
      name: editName.trim(),
      phone: editPhone.replace(/\D/g, ''),
      email: editEmail.trim() || undefined,
      cpf: editCpf.replace(/\D/g, '') || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian', params.id] });
      qc.invalidateQueries({ queryKey: ['guardians'] });
      setEditing(false);
    },
  });

  const linkStudentMut = useMutation({
    mutationFn: () => studentsApi.linkGuardian(selectedStudent!.id, {
      guardianId: params.id,
      relationship: 'responsavel',
      kinshipDegree: kinshipDegree || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian', params.id] });
      qc.invalidateQueries({ queryKey: ['students-for-link'] });
      resetAddStudent();
    },
  });

  const createAndLinkMut = useMutation({
    mutationFn: async () => {
      const student = await studentsApi.create({
        name: newName.trim(),
        classId: newClassId || undefined,
        enrollmentCode: newEnrollment.trim() || undefined,
      });
      await studentsApi.linkGuardian(student.data.id, {
        guardianId: params.id,
        relationship: 'responsavel',
        kinshipDegree: newKinship || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian', params.id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      resetAddStudent();
    },
  });

  const unlinkStudentMut = useMutation({
    mutationFn: (studentId: string) => studentsApi.unlinkGuardian(studentId, params.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian', params.id] });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;
  if (!guardian) return <div className="text-center py-12 text-gray-400">Responsável não encontrado</div>;

  const studentLinks: StudentLink[] = guardian.studentGuardians ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{guardian.name || <span className="italic text-gray-400">Sem nome</span>}</h1>
          <p className="text-sm text-gray-500">{formatPhone(guardian.phone)}{guardian.email ? ` · ${guardian.email}` : ''}</p>
        </div>
        {!editing && (
          <button onClick={openEdit} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            <Pencil size={14} /> Editar
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Editar responsável</h2>
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
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
              {updateMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Info card */}
      {!editing && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0',
              guardian.activatedAt ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400')}>
              {(guardian.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {guardian.activatedAt ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    <UserCircle size={11} /> Conta ativa
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">Aguardando acesso</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                {guardian.cpf && <span className="font-mono">CPF {formatCpf(guardian.cpf)}</span>}
                {guardian.phone && <span className="flex items-center gap-1"><Phone size={11} />{formatPhone(guardian.phone)}</span>}
                {guardian.email && <span className="flex items-center gap-1"><Mail size={11} />{guardian.email}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alunos vinculados */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Alunos vinculados</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddMode('existing'); setShowAddStudent(!showAddStudent); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200">
              <Plus size={14} /> Vincular existente
            </button>
            <button
              onClick={() => { setAddMode('new'); setShowAddStudent(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded-lg">
              <Plus size={14} /> Novo aluno
            </button>
          </div>
        </div>

        {showAddStudent && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
            {/* Abas */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setAddMode('existing')}
                className={cn('px-3 py-1.5 rounded text-xs font-medium transition-all', addMode === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              >
                Vincular existente
              </button>
              <button
                onClick={() => setAddMode('new')}
                className={cn('px-3 py-1.5 rounded text-xs font-medium transition-all', addMode === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              >
                Criar novo aluno
              </button>
            </div>

            {/* ── Vincular existente ── */}
            {addMode === 'existing' && (
              <>
                {selectedStudent ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-primary-300">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium flex-shrink-0">
                      {selectedStudent.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.name}</p>
                      {selectedStudent.class && (
                        <p className="text-xs text-gray-500">{selectedStudent.class.name} · {selectedStudent.class.grade}</p>
                      )}
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="text-gray-300 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Buscar aluno por nome ou turma..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    {filteredStudents.length > 0 && (
                      <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-44 overflow-y-auto divide-y divide-gray-50">
                        {filteredStudents.slice(0, 20).map((s) => (
                          <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(''); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors">
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            {s.class && <p className="text-xs text-gray-500">{s.class.name} · {s.class.grade}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                    {studentSearch && filteredStudents.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 text-center">Nenhum aluno encontrado</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grau de parentesco</label>
                  <select value={kinshipDegree} onChange={(e) => setKinshipDegree(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                    <option value="">Não informado</option>
                    <option value="Pai">Pai</option>
                    <option value="Mãe">Mãe</option>
                    <option value="Avô/Avó">Avô/Avó</option>
                    <option value="Tio/Tia">Tio/Tia</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                {linkStudentMut.isError && (
                  <p className="text-xs text-red-600">{(linkStudentMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao vincular aluno'}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={resetAddStudent} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button onClick={() => linkStudentMut.mutate()} disabled={!selectedStudent || linkStudentMut.isPending}
                    className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                    {linkStudentMut.isPending ? 'Vinculando...' : 'Vincular'}
                  </button>
                </div>
              </>
            )}

            {/* ── Criar novo aluno ── */}
            {addMode === 'new' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome do aluno *</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Turma</label>
                    <select value={newClassId} onChange={(e) => setNewClassId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                      <option value="">Sem turma</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.grade ? ` — ${c.grade}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Matrícula</label>
                    <input value={newEnrollment} onChange={(e) => setNewEnrollment(e.target.value)} placeholder="Opcional"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Grau de parentesco</label>
                    <select value={newKinship} onChange={(e) => setNewKinship(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                      <option value="">Não informado</option>
                      <option value="Pai">Pai</option>
                      <option value="Mãe">Mãe</option>
                      <option value="Avô/Avó">Avô/Avó</option>
                      <option value="Tio/Tia">Tio/Tia</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
                {createAndLinkMut.isError && (
                  <p className="text-xs text-red-600">{(createAndLinkMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar aluno'}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={resetAddStudent} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button onClick={() => createAndLinkMut.mutate()} disabled={!newName.trim() || createAndLinkMut.isPending}
                    className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                    {createAndLinkMut.isPending ? 'Criando...' : 'Criar e vincular'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {studentLinks.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nenhum aluno vinculado</div>
          ) : studentLinks.map((sg) => (
            <div key={sg.student.id} className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm flex-shrink-0">
                {sg.student.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/dashboard/students/${sg.student.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 hover:underline">
                    {sg.student.name}
                  </a>
                  {(sg.kinshipDegree || sg.relationship) && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                      {sg.kinshipDegree || RELATIONSHIP_LABELS[sg.relationship?.toLowerCase()] || sg.relationship}
                    </span>
                  )}
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', sg.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                    {sg.status === 'ACTIVE' ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                  <GraduationCap size={11} />
                  <span>{sg.student.class?.name} · {sg.student.class?.grade}</span>
                </div>
              </div>
              <button onClick={() => unlinkStudentMut.mutate(sg.student.id)} disabled={unlinkStudentMut.isPending}
                className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 flex-shrink-0" title="Desvincular">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
