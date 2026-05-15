'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { classesApi, usersApi, studentsApi, roomsApi } from '@/lib/api';
import { ArrowLeft, Loader2, UserCircle, Pencil, Plus, X, Search, DoorOpen, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';

type Student = { id: string; name: string; enrollmentCode?: string; studentGuardians: { guardian: { name: string; phone: string; activatedAt?: string } }[] };
type Teacher = { teacher: { id: string; name: string }; subject?: string; isHomeroom: boolean };
type ClassRoom = { id: string; shift: string; label?: string; room: { id: string; name: string } };

const SHIFT_LABELS: Record<string, string> = {
  MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
};
const SHIFTS = ['MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL'] as const;

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // teacher panel state
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [isHomeroom, setIsHomeroom] = useState(false);

  // room panel state
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('MATUTINO');
  const [roomLabel, setRoomLabel] = useState('');

  // student panel state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', params.id],
    queryFn: () => classesApi.get(params.id).then((r) => r.data),
  });
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students', params.id],
    queryFn: () => classesApi.students(params.id).then((r) => r.data),
  });
  const { data: usersData } = useQuery({
    queryKey: ['users', false],
    queryFn: () => usersApi.list({ limit: 200 }).then((r) => r.data),
  });
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list({ limit: 200 }).then((r) => r.data),
    enabled: showAddRoom,
  });

  // all students not already in this class
  const { data: allStudentsData } = useQuery({
    queryKey: ['students', false],
    queryFn: () => studentsApi.list({ limit: 500 }).then((r) => r.data),
    enabled: showAddStudent,
  });

  const currentRoomShiftKeys = new Set((cls?.classRooms ?? []).map((cr: ClassRoom) => `${cr.room.id}:${cr.shift}`));
  const availableRooms = (roomsData?.data ?? []).filter((r: { id: string }) =>
    !currentRoomShiftKeys.has(`${r.id}:${selectedShift}`)
  );

  const availableTeachers = (usersData?.data ?? []).filter(
    (u: { id: string; role: string }) =>
      u.role === 'TEACHER' && !cls?.classTeachers?.some((ct: Teacher) => ct.teacher.id === u.id),
  );

  const currentStudentIds = new Set((students ?? []).map((s: Student) => s.id));
  const availableStudents = useMemo(() => {
    const all: { id: string; name: string; enrollmentCode?: string; class?: { name: string } }[] = allStudentsData?.data ?? [];
    return all.filter(
      (s) => !s.class &&
        (!studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.enrollmentCode?.includes(studentSearch)),
    );
  }, [allStudentsData, studentSearch, currentStudentIds]);

  const addRoomMut = useMutation({
    mutationFn: () => classesApi.addRoom(params.id, { roomId: selectedRoomId, shift: selectedShift, label: roomLabel || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', params.id] });
      setShowAddRoom(false);
      setSelectedRoomId('');
      setRoomLabel('');
    },
  });

  const removeRoomMut = useMutation({
    mutationFn: ({ roomId, shift }: { roomId: string; shift: string }) => classesApi.removeRoom(params.id, { roomId, shift }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class', params.id] }),
  });

  const addTeacherMut = useMutation({
    mutationFn: () => classesApi.addTeacher(params.id, { teacherId: selectedTeacherId, subject: subject || undefined, isHomeroom }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', params.id] });
      setShowAddTeacher(false);
      setSelectedTeacherId('');
      setSubject('');
      setIsHomeroom(false);
    },
  });

  const removeTeacherMut = useMutation({
    mutationFn: (teacherId: string) => classesApi.removeTeacher(params.id, teacherId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class', params.id] }),
  });

  const addStudentMut = useMutation({
    mutationFn: () => studentsApi.update(selectedStudentId, { classId: params.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-students', params.id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setShowAddStudent(false);
      setStudentSearch('');
      setSelectedStudentId('');
    },
  });


  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{cls?.name}</h1>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-0.5">
            <p className="text-sm text-gray-500">{[cls?.grade, cls?.year].filter(Boolean).join(' · ')}</p>
            {(cls?.classRooms ?? []).map((cr: ClassRoom) => (
              <span key={cr.id} className="inline-flex items-center gap-1 text-sm text-gray-500">
                <DoorOpen size={14} className="text-gray-400" />
                {cr.room.name} · {SHIFT_LABELS[cr.shift] ?? cr.shift}
                {cr.label && <span className="text-gray-400">({cr.label})</span>}
              </span>
            ))}
          </div>
        </div>
        <Link href={`/dashboard/communications?classId=${params.id}&label=${encodeURIComponent(cls?.name ?? '')}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          <MessageSquare size={14} /> Comunicados
        </Link>
        <Link href={`/dashboard/classes/${params.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          <Pencil size={14} /> Editar turma
        </Link>
      </div>

      {/* Salas e Turnos */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Salas e Turnos</h2>
          <button onClick={() => { setShowAddRoom(!showAddRoom); setShowAddTeacher(false); setShowAddStudent(false); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200">
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {showAddRoom && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sala *</label>
                <SearchableSelect
                  options={(availableRooms ?? []).map((r: { id: string; name: string }) => ({ id: r.id, label: r.name }))}
                  value={selectedRoomId}
                  onChange={setSelectedRoomId}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Turno *</label>
                <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                  {SHIFTS.map((s) => <option key={s} value={s}>{SHIFT_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rótulo (opcional)</label>
              <input value={roomLabel} onChange={(e) => setRoomLabel(e.target.value)} placeholder="Ex: Grupo A"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddRoom(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={() => addRoomMut.mutate()} disabled={!selectedRoomId || addRoomMut.isPending}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                {addRoomMut.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {(cls?.classRooms ?? []).length === 0 && !showAddRoom && (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma sala vinculada</div>
          )}
          {(cls?.classRooms ?? []).map((cr: ClassRoom) => (
            <div key={cr.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">
                <DoorOpen size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{cr.room.name}</p>
                <p className="text-xs text-gray-400">{SHIFT_LABELS[cr.shift] ?? cr.shift}{cr.label ? ` · ${cr.label}` : ''}</p>
              </div>
              <button onClick={() => removeRoomMut.mutate({ roomId: cr.room.id, shift: cr.shift })} disabled={removeRoomMut.isPending}
                className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50" title="Remover">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Professores */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Professores</h2>
          <button onClick={() => { setShowAddTeacher(!showAddTeacher); setShowAddStudent(false); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200">
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {showAddTeacher && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Professor *</label>
                <SearchableSelect
                  options={availableTeachers.map((u: { id: string; name: string }) => ({ id: u.id, label: u.name }))}
                  value={selectedTeacherId}
                  onChange={setSelectedTeacherId}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Disciplina</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Matemática"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isHomeroom} onChange={(e) => setIsHomeroom(e.target.checked)} className="rounded" />
                Professor titular
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowAddTeacher(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={() => addTeacherMut.mutate()} disabled={!selectedTeacherId || addTeacherMut.isPending}
                  className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                  {addTeacherMut.isPending ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {cls?.classTeachers?.length === 0 && !showAddTeacher && (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum professor associado</div>
          )}
          {cls?.classTeachers?.map((ct: Teacher) => (
            <div key={ct.teacher.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-medium text-sm">
                {ct.teacher.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{ct.teacher.name}</p>
                <p className="text-xs text-gray-400">{[ct.subject, ct.isHomeroom ? 'Titular' : ''].filter(Boolean).join(' · ') || 'Sem disciplina'}</p>
              </div>
              <button onClick={() => removeTeacherMut.mutate(ct.teacher.id)} disabled={removeTeacherMut.isPending}
                className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50" title="Remover">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Alunos */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Alunos</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{students?.length ?? 0} aluno{students?.length !== 1 ? 's' : ''}</span>
            <button onClick={() => { setShowAddStudent(!showAddStudent); setShowAddTeacher(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200">
              <Plus size={14} /> Associar existente
            </button>
            <Link href={`/dashboard/students/new?classId=${params.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded-lg">
              <Plus size={14} /> Novo aluno
            </Link>
          </div>
        </div>

        {showAddStudent && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {availableStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nenhum aluno encontrado
                </p>
              ) : availableStudents.map((s) => (
                <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors ${selectedStudentId === s.id ? 'bg-primary-50' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${selectedStudentId === s.id ? 'bg-primary-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {s.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{[s.enrollmentCode ? `Mat: ${s.enrollmentCode}` : '', s.class?.name].filter(Boolean).join(' · ')}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAddStudent(false); setStudentSearch(''); setSelectedStudentId(''); }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={() => addStudentMut.mutate()} disabled={!selectedStudentId || addStudentMut.isPending}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                {addStudentMut.isPending ? 'Associando...' : 'Associar à turma'}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {loadingStudents ? (
            <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-primary-600" /></div>
          ) : students?.length === 0 && !showAddStudent ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nenhum aluno nesta turma</div>
          ) : students?.map((student: Student) => (
            <div key={student.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium text-sm">
                {student.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{student.name}</p>
                {student.enrollmentCode && <p className="text-xs text-gray-400">Mat: {student.enrollmentCode}</p>}
              </div>
              <div className="flex items-center gap-1">
                {student.studentGuardians.map((sg, i) => (
                  <div key={i} className="flex items-center" title={sg.guardian.name}>
                    <UserCircle size={16} className={sg.guardian.activatedAt ? 'text-green-500' : 'text-gray-300'} />
                  </div>
                ))}
                {student.studentGuardians.length === 0 && <span className="text-xs text-gray-300">Sem resp.</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
