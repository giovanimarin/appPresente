'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { studentsApi, guardiansApi } from '@/lib/api';
import { ArrowLeft, Loader2, Pencil, Plus, X, Phone, Mail, UserCircle, Search, UserCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { formatPhone, maskPhone, cn } from '@/lib/utils';

const RELATIONSHIP_LABELS: Record<string, string> = {
  mae: 'Mãe', mãe: 'Mãe', pai: 'Pai', avo: 'Avô/Avó', avó: 'Avó', avô: 'Avô',
  tio: 'Tio', tia: 'Tia', responsavel: 'Responsável', responsável: 'Responsável', outro: 'Outro',
};

type StudentGuardian = {
  relationship: string;
  status: string;
  isPrimary: boolean;
  guardian: {
    id: string; name: string; phone: string; email?: string;
    activatedAt?: string; pushToken?: string; deviceType?: string;
  };
};

type GuardianOption = { id: string; name: string; phone: string; email?: string; activatedAt?: string };

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');

  // Existing guardian link
  const [guardianSearch, setGuardianSearch] = useState('');
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianOption | null>(null);

  // New guardian form
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [relationship, setRelationship] = useState('responsavel');

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', params.id],
    queryFn: () => studentsApi.get(params.id).then((r) => r.data),
  });

  const { data: guardians, isLoading: loadingGuardians } = useQuery({
    queryKey: ['student-guardians', params.id],
    queryFn: () => studentsApi.guardians(params.id).then((r) => r.data),
  });

  const { data: allGuardiansData } = useQuery({
    queryKey: ['guardians-for-link'],
    queryFn: () => guardiansApi.list({ limit: 500 }).then((r) => r.data),
    enabled: showAdd && addMode === 'existing',
  });

  const allGuardians: GuardianOption[] = useMemo(() => {
    const existing = ((guardians as StudentGuardian[]) ?? []).map((sg) => sg.guardian.id);
    return (allGuardiansData?.data ?? []).filter((g: GuardianOption) => !existing.includes(g.id));
  }, [allGuardiansData, guardians]);

  const filteredGuardians = useMemo(() => {
    if (!guardianSearch.trim()) return allGuardians;
    const q = guardianSearch.toLowerCase();
    return allGuardians.filter(
      (g) => g.name?.toLowerCase().includes(q) || g.phone?.includes(q) || g.email?.toLowerCase().includes(q),
    );
  }, [allGuardians, guardianSearch]);

  function resetAdd() {
    setShowAdd(false);
    setAddMode('existing');
    setGuardianSearch('');
    setSelectedGuardian(null);
    setPhone('');
    setName('');
    setEmail('');
    setRelationship('responsavel');
  }

  const linkMut = useMutation({
    mutationFn: () => {
      if (addMode === 'existing' && selectedGuardian) {
        return studentsApi.linkGuardian(params.id, { guardianId: selectedGuardian.id, relationship });
      }
      return studentsApi.linkGuardian(params.id, { phone: phone.trim(), name: name.trim() || undefined, email: email.trim() || undefined, relationship });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-guardians', params.id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['guardians-for-link'] });
      resetAdd();
    },
  });

  const unlinkMut = useMutation({
    mutationFn: (guardianId: string) => studentsApi.unlinkGuardian(params.id, guardianId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-guardians', params.id] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const canSubmit = addMode === 'existing' ? !!selectedGuardian : !!phone.trim();

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;
  if (!student) return <div className="text-center py-12 text-gray-400">Aluno não encontrado</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
          <p className="text-sm text-gray-500">
            {[student.class?.name, student.class?.grade, student.enrollmentCode ? `Mat: ${student.enrollmentCode}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link href={`/dashboard/students/${params.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          <Pencil size={14} /> Editar
        </Link>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
        {student.birthDate && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Data de nascimento</p>
            <p className="text-gray-700">{new Date(student.birthDate).toLocaleDateString('pt-BR')}</p>
          </div>
        )}
        {student.gender && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Gênero</p>
            <p className="text-gray-700">{student.gender === 'M' ? 'Masculino' : student.gender === 'F' ? 'Feminino' : student.gender}</p>
          </div>
        )}
        {student.notes && (
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-0.5">Observações</p>
            <p className="text-gray-700">{student.notes}</p>
          </div>
        )}
        {!student.birthDate && !student.gender && !student.notes && (
          <p className="col-span-2 text-gray-400 italic text-xs">Nenhuma informação adicional cadastrada</p>
        )}
      </div>

      {/* Responsáveis */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Responsáveis</h2>
          <button onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200">
            <Plus size={14} /> Adicionar responsável
          </button>
        </div>

        {showAdd && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => { setAddMode('existing'); setSelectedGuardian(null); setGuardianSearch(''); }}
                className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  addMode === 'existing' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700')}
              >
                <UserCheck size={13} /> Responsável existente
              </button>
              <button
                onClick={() => { setAddMode('new'); setSelectedGuardian(null); }}
                className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  addMode === 'new' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700')}
              >
                <UserPlus size={13} /> Novo responsável
              </button>
            </div>

            {addMode === 'existing' ? (
              <div className="space-y-3">
                {selectedGuardian ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-primary-300">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-medium flex-shrink-0">
                      {(selectedGuardian.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{selectedGuardian.name || <span className="italic text-gray-400">Sem nome</span>}</p>
                      <p className="text-xs text-gray-500">{formatPhone(selectedGuardian.phone)}</p>
                    </div>
                    <button onClick={() => setSelectedGuardian(null)} className="text-gray-300 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={guardianSearch}
                        onChange={(e) => setGuardianSearch(e.target.value)}
                        placeholder="Buscar por nome, telefone ou e-mail..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    {filteredGuardians.length > 0 && (
                      <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-44 overflow-y-auto divide-y divide-gray-50">
                        {filteredGuardians.slice(0, 20).map((g) => (
                          <button
                            key={g.id}
                            onClick={() => { setSelectedGuardian(g); setGuardianSearch(''); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900">{g.name || <span className="italic text-gray-400">Sem nome</span>}</p>
                            <p className="text-xs text-gray-500">{formatPhone(g.phone)}{g.email ? ` · ${g.email}` : ''}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {guardianSearch && filteredGuardians.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 text-center">Nenhum responsável encontrado</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone *</label>
                    <input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do responsável"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Relação</label>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
                <option value="avo">Avô/Avó</option>
                <option value="tio">Tio/Tia</option>
                <option value="responsavel">Responsável</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {linkMut.isError && (
              <p className="text-xs text-red-600">{(linkMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao vincular responsável'}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={resetAdd} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={() => linkMut.mutate()} disabled={!canSubmit || linkMut.isPending}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60">
                {linkMut.isPending ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {loadingGuardians ? (
            <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-primary-600" /></div>
          ) : !guardians?.length ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nenhum responsável vinculado</div>
          ) : (guardians as StudentGuardian[]).map((sg) => (
            <div key={sg.guardian.id} className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm flex-shrink-0">
                {(sg.guardian.name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/guardians/${sg.guardian.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 hover:underline">
                    {sg.guardian.name || <span className="italic text-gray-400">Sem nome</span>}
                  </Link>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                    {RELATIONSHIP_LABELS[sg.relationship.toLowerCase()] ?? sg.relationship}
                  </span>
                  {sg.guardian.activatedAt ? (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                      <UserCircle size={11} /> Ativo
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Pendente</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Phone size={11} />{formatPhone(sg.guardian.phone)}</span>
                  {sg.guardian.email && <span className="flex items-center gap-1"><Mail size={11} />{sg.guardian.email}</span>}
                </div>
              </div>
              <button onClick={() => unlinkMut.mutate(sg.guardian.id)} disabled={unlinkMut.isPending}
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
