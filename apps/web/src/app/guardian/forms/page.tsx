'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationsApi, formsApi, guardiansApi, uploadsApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatDateTime, cn } from '@/lib/utils';
import { FileText, Plus, Loader2, CheckCircle2, Clock, AlertCircle, X, ChevronDown, ChevronUp, Paperclip, Upload } from 'lucide-react';
import DateInput from '@/components/DateInput';
import axios from 'axios';

type MyRequest = {
  id: string;
  title: string;
  body: string;
  guardianType: string;
  guardianStatus: string;
  protocolNumber?: string;
  createdAt: string;
  commStudents: { student?: { name: string } }[];
};

type FormField = {
  id: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DATE' | 'FILE';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

type AvailableForm = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  schoolId: string;
  expiresAt?: string;
};

type FormSubmission = {
  id: string;
  status: string;
  protocolNumber?: string;
  submittedAt: string;
  answers: Record<string, unknown>;
  form: { id: string; title: string; fields: FormField[] };
  student: { id: string; name: string };
};

type Student = { id: string; name: string; grade: string };
type SchoolEntry = {
  school: { id: string; name: string };
  students: Student[];
  preference: { color: string };
};

const COMM_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SENT: { label: 'Enviado', color: '#6366f1', icon: Clock },
  RECEIVED: { label: 'Recebido', color: '#0ea5e9', icon: CheckCircle2 },
  UNDER_REVIEW: { label: 'Em análise', color: '#f59e0b', icon: AlertCircle },
  RESOLVED: { label: 'Resolvido', color: '#10b981', icon: CheckCircle2 },
};

const FORM_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pendente', color: '#6366f1', icon: Clock },
  UNDER_REVIEW: { label: 'Em análise', color: '#f59e0b', icon: AlertCircle },
  RESOLVED: { label: 'Resolvido', color: '#10b981', icon: CheckCircle2 },
};

// ── Dynamic field renderer ────────────────────────────────────────────────────

function FormFieldInput({ field, value, onChange, onFileChange, fileValue }: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  onFileChange?: (file: File | null) => void;
  fileValue?: File | null;
}) {
  const base = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none';

  switch (field.type) {
    case 'TEXTAREA':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(base, 'resize-none')}
        />
      );
    case 'SELECT':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">Selecione...</option>
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case 'DATE':
      return <DateInput value={(value as string) ?? ''} onChange={onChange} className={base} />;
    case 'CHECKBOX':
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-indigo-600 w-4 h-4"
          />
          <span className="text-gray-700">{field.placeholder ?? 'Sim'}</span>
        </label>
      );
    case 'FILE':
      return (
        <div className="space-y-2">
          <label className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            fileValue ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50',
          )}>
            <input
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => onFileChange?.(e.target.files?.[0] ?? null)}
            />
            <Upload size={16} className={fileValue ? 'text-indigo-500' : 'text-gray-400'} />
            <span className={cn('text-sm truncate', fileValue ? 'text-indigo-700 font-medium' : 'text-gray-500')}>
              {fileValue ? fileValue.name : 'Toque para selecionar arquivo ou foto'}
            </span>
            {fileValue && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onFileChange?.(null); }}
                className="ml-auto text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <p className="text-[10px] text-gray-400">PDF, Word, imagem — máx. 10 MB</p>
        </div>
      );
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      );
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GuardianFormsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [customStudentId, setCustomStudentId] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [fileAnswers, setFileAnswers] = useState<Record<string, File>>({});
  const [uploading, setUploading] = useState(false);

  // List state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) router.push('/guardian');
  }, [router]);

  const { data: schools = [] } = useQuery<SchoolEntry[]>({
    queryKey: ['guardian-my-schools'],
    queryFn: () => guardiansApi.mySchools().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery<MyRequest[]>({
    queryKey: ['guardian-my-requests'],
    queryFn: () => communicationsApi.myRequests().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: submissions = [], isLoading: subLoading } = useQuery<FormSubmission[]>({
    queryKey: ['guardian-my-form-submissions'],
    queryFn: () => formsApi.mySubmissions().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: availableForms = [], isLoading: formsLoading } = useQuery<AvailableForm[]>({
    queryKey: ['guardian-available-forms'],
    queryFn: () => formsApi.guardianForms().then((r) => r.data),
    enabled: isAuthenticated() && showForm,
  });

  const allStudents = schools.flatMap((s) => s.students);
  const selectedForm = availableForms.find((f) => f.id === selectedFormId);

  async function uploadFiles(formId: string): Promise<Record<string, { key: string; filename: string }>> {
    const uploaded: Record<string, { key: string; filename: string }> = {};
    for (const [fieldId, file] of Object.entries(fileAnswers)) {
      const { data } = await uploadsApi.guardianRequest({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        formId,
      });
      await axios.put(data.uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      uploaded[fieldId] = { key: data.key, filename: file.name };
    }
    return uploaded;
  }

  const submitFormMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const fileUploads = await uploadFiles(selectedFormId!);
        const finalAnswers = { ...answers };
        for (const [fieldId, info] of Object.entries(fileUploads)) {
          finalAnswers[fieldId] = info;
        }
        await formsApi.submit(selectedFormId!, { studentId: customStudentId, answers: finalAnswers });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian-my-form-submissions'] });
      closeModal();
    },
  });

  function closeModal() {
    setShowForm(false);
    setSelectedFormId(null);
    setCustomStudentId('');
    setAnswers({});
    setFileAnswers({});
  }

  // Validate: all required fields filled
  const formValid =
    !!selectedFormId &&
    !!customStudentId &&
    (!selectedForm || selectedForm.fields.every((f) => {
      if (!f.required) return true;
      if (f.type === 'FILE') return !!fileAnswers[f.id];
      if (f.type === 'CHECKBOX') return true;
      const v = answers[f.id];
      return v !== undefined && v !== '' && v !== null;
    }));

  // Merged list sorted by date
  const allItems = [
    ...requests.map((r) => ({ _type: 'comm' as const, _date: r.createdAt, data: r })),
    ...submissions.map((s) => ({ _type: 'form' as const, _date: s.submittedAt, data: s })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());

  const isLoading = reqLoading || subLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 pb-3 max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-base">Pedidos</h1>
          <p className="text-xs text-gray-500">Justificativas e solicitações</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium"
        >
          <Plus size={14} />
          Novo pedido
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 pb-20 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-indigo-400" />
            </div>
            <p className="text-gray-700 font-semibold">Nenhum pedido ainda</p>
            <p className="text-gray-400 text-sm mt-1">Toque em &quot;Novo pedido&quot; para começar</p>
          </div>
        ) : (
          allItems.map((item) => {
            if (item._type === 'comm') {
              const req = item.data as MyRequest;
              const cfg = COMM_STATUS[req.guardianStatus] ?? COMM_STATUS.SENT;
              const StatusIcon = cfg.icon;
              const students = req.commStudents?.map((cs) => cs.student?.name).filter(Boolean).join(', ');
              const isExpanded = expandedId === req.id;
              return (
                <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button className="w-full text-left p-4 focus:outline-none" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">{req.guardianType}</span>
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                            <StatusIcon size={10} />{cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{req.title}</p>
                        {students && <p className="text-xs text-gray-500 mt-0.5">{students}</p>}
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-300 mt-1 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-300 mt-1 flex-shrink-0" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
                      <p className="text-sm text-gray-600 leading-relaxed">{req.body}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-400">{formatDateTime(req.createdAt)}</span>
                        {req.protocolNumber && <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded">#{req.protocolNumber}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              const sub = item.data as FormSubmission;
              const cfg = FORM_STATUS[sub.status] ?? FORM_STATUS.PENDING;
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === sub.id;
              return (
                <div key={sub.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button className="w-full text-left p-4 focus:outline-none" onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Formulário</span>
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                            <StatusIcon size={10} />{cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{sub.form.title}</p>
                        {sub.student && <p className="text-xs text-gray-500 mt-0.5">{sub.student.name}</p>}
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-300 mt-1 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-300 mt-1 flex-shrink-0" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
                      {sub.form.fields?.map((field) => {
                        const val = sub.answers[field.id];
                        if (val === undefined || val === null || val === '') return null;
                        if (field.type === 'FILE') {
                          const f = val as { filename: string; key: string };
                          return (
                            <div key={field.id} className="flex items-center gap-2 text-xs text-gray-600">
                              <Paperclip size={11} className="text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-gray-500">{field.label}: </span>
                              <span>{f.filename ?? '—'}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={field.id} className="text-xs text-gray-600">
                            <span className="font-medium text-gray-500">{field.label}: </span>
                            {field.type === 'CHECKBOX' ? (val ? 'Sim' : 'Não') : String(val)}
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-400">{formatDateTime(sub.submittedAt)}</span>
                        {sub.protocolNumber && <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded">#{sub.protocolNumber}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          })
        )}
      </div>

      {/* Modal — full-height sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-lg mx-auto rounded-t-2xl h-[88vh] flex flex-col">
            {/* Header fixo */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-900">Novo pedido</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {formsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={22} className="animate-spin text-indigo-400" />
                </div>
              ) : availableForms.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Nenhum formulário disponível</p>
                  <p className="text-xs text-gray-400 mt-1">A escola ainda não abriu formulários para envio</p>
                </div>
              ) : (
                <>
                  {/* Seleção de formulário */}
                  {!selectedFormId && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Selecione o tipo de pedido</label>
                      <div className="space-y-2">
                        {availableForms.map((form) => (
                          <button
                            key={form.id}
                            onClick={() => { setSelectedFormId(form.id); setAnswers({}); setFileAnswers({}); setCustomStudentId(''); }}
                            className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                          >
                            <span className="font-semibold text-gray-900">{form.title}</span>
                            {form.description && <span className="block text-xs text-gray-500 mt-0.5">{form.description}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulário selecionado */}
                  {selectedFormId && selectedForm && (
                    <>
                      {/* Breadcrumb / back */}
                      <button
                        onClick={() => { setSelectedFormId(null); setAnswers({}); setFileAnswers({}); setCustomStudentId(''); }}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium -mb-1"
                      >
                        ← Voltar
                      </button>

                      <div className="bg-indigo-50 rounded-xl px-4 py-3">
                        <p className="text-sm font-semibold text-indigo-800">{selectedForm.title}</p>
                        {selectedForm.description && <p className="text-xs text-indigo-600 mt-0.5">{selectedForm.description}</p>}
                      </div>

                      {/* Aluno */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Aluno <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={customStudentId}
                          onChange={(e) => setCustomStudentId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        >
                          <option value="">Selecione o aluno...</option>
                          {allStudents.map((st) => (
                            <option key={st.id} value={st.id}>{st.name} — {st.grade}</option>
                          ))}
                        </select>
                      </div>

                      {/* Campos dinâmicos */}
                      {selectedForm.fields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <FormFieldInput
                            field={field}
                            value={answers[field.id]}
                            onChange={(val) => setAnswers((prev) => ({ ...prev, [field.id]: val }))}
                            fileValue={fileAnswers[field.id] ?? null}
                            onFileChange={(file) => {
                              setFileAnswers((prev) => {
                                const next = { ...prev };
                                if (file) next[field.id] = file;
                                else delete next[field.id];
                                return next;
                              });
                            }}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Botão fixo no rodapé */}
            {selectedFormId && selectedForm && (
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => submitFormMutation.mutate()}
                  disabled={!formValid || submitFormMutation.isPending || uploading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(submitFormMutation.isPending || uploading) && <Loader2 size={16} className="animate-spin" />}
                  {uploading ? 'Enviando arquivos...' : submitFormMutation.isPending ? 'Enviando...' : 'Enviar pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
