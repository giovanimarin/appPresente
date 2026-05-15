'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { studentsApi, guardiansApi } from '@/lib/api';
import { ArrowLeft, Loader2, Pencil, Plus, X, Phone, Mail, UserCircle, Search, UserCheck, UserPlus, Shield, Banknote } from 'lucide-react';
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
  kinshipDegree?: string | null;
  isLegalGuardian: boolean;
  isFinancialGuardian: boolean;
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
  const [newCpfDisplay, setNewCpfDisplay] = useState('');
  const [newCpfDigits, setNewCpfDigits] = useState('');

  const [kinshipDegree, setKinshipDegree] = useState('');
  const [isLegalGuardian, setIsLegalGuardian] = useState(false);
  const [isFinancialGuardian, setIsFinancialGuardian] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', params.id],
    queryFn: () => studentsApi.get(params.id).then((r) => r.data),
  });

  const { data: guardians, isLoading: loadingGuardians } = useQuery({
    queryKey: ['student-guardians', params.id],
    queryFn: () => studentsApi.guardians(params.id).then((r) => r.data),
  });

  const searchTrimmed = guardianSearch.trim();
  const { data: allGuardiansData } = useQuery({
    queryKey: ['guardians-for-link', searchTrimmed],
    queryFn: () => guardiansApi.list({ limit: 50, search: searchTrimmed }).then((r) => r.data),
    enabled: showAdd && addMode === 'existing' && searchTrimmed.length >= 3,
  });

  const allGuardians: GuardianOption[] = useMemo(() => {
    const existing = ((guardians as StudentGuardian[]) ?? []).map((sg) => sg.guardian.id);
    return (allGuardiansData?.data ?? []).filter((g: GuardianOption) => !existing.includes(g.id));
  }, [allGuardiansData, guardians]);

  function handleNewCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 9) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    else if (digits.length > 6) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    else if (digits.length > 3) masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    setNewCpfDisplay(masked);
    setNewCpfDigits(digits);
  }

  function resetAdd() {
    setShowAdd(false);
    setAddMode('existing');
    setGuardianSearch('');
    setSelectedGuardian(null);
    setPhone('');
    setName('');
    setEmail('');
    setNewCpfDisplay('');
    setNewCpfDigits('');
    setRelationship('responsavel');
    setKinshipDegree('');
    setIsLegalGuardian(false);
    setIsFinancialGuardian(false);
  }

  const linkMut = useMutation({
    mutationFn: () => {
      const relationshipFields = {
        relationship: 'responsavel',
        kinshipDegree: kinshipDegree || undefined,
        isLegalGuardian,
        isFinancialGuardian,
      };
      if (addMode === 'existing' && selectedGuardian) {
        return studentsApi.linkGuardian(params.id, { guardianId: selectedGuardian.id, ...relationshipFields });
      }
      return studentsApi.linkGuardian(params.id, { phone: phone.trim(), name: name.trim() || undefined, email: email.trim() || undefined, cpf: newCpfDigits || undefined, ...relationshipFields });
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
        {student.cpf && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">CPF</p>
            <p className="text-gray-700">{student.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
          </div>
        )}
        {student.notes && (
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-0.5">Observações</p>
            <p className="text-gray-700">{student.notes}</p>
          </div>
        )}
        {!student.birthDate && !student.gender && !student.cpf && !student.notes && (
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
                    {allGuardians.length > 0 && (
                      <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-44 overflow-y-auto divide-y divide-gray-50">
                        {allGuardians.slice(0, 20).map((g) => (
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
                    {searchTrimmed.length > 0 && searchTrimmed.length < 3 && (
                      <p className="text-xs text-gray-400 mt-1.5 text-center">Digite ao menos 3 caracteres para buscar</p>
                    )}
                    {searchTrimmed.length >= 3 && allGuardians.length === 0 && (
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                    <input value={newCpfDisplay} onChange={handleNewCpfChange} placeholder="000.000.000-00" inputMode="numeric"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Relationship fields — shared for both modes */}
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
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={isLegalGuardian} onChange={(e) => setIsLegalGuardian(e.target.checked)} className="rounded" />
                Responsável legal
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={isFinancialGuardian} onChange={(e) => setIsFinancialGuardian(e.target.checked)} className="rounded" />
                Responsável financeiro
              </label>
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
                    {sg.kinshipDegree || RELATIONSHIP_LABELS[sg.relationship.toLowerCase()] || sg.relationship}
                  </span>
                  {sg.guardian.activatedAt ? (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                      <UserCircle size={11} /> Ativo
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Pendente</span>
                  )}
                  {sg.isLegalGuardian && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                      <Shield size={10} /> Legal
                    </span>
                  )}
                  {sg.isFinancialGuardian && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                      <Banknote size={10} /> Financeiro
                    </span>
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
