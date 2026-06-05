'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import DateInput from '@/components/DateInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { communicationsApi, classesApi, studentsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowLeft, Send, Save, Search, Bell, Mail } from 'lucide-react';

const schema = z.object({
  schoolType: z.enum(['NOTICE', 'URGENT', 'INFORMATIVE', 'DOCUMENT', 'PHOTO', 'EXAM', 'MEETING']),
  title: z.string().min(1, 'Título obrigatório').max(300),
  body: z.string().min(1, 'Conteúdo obrigatório'),
  eventDate: z.string().optional(),
  scope: z.enum(['CLASS', 'STUDENT']),
  targetIds: z.array(z.string()).min(1, 'Selecione ao menos um destino'),
  audienceFilter: z.enum(['ALL', 'LEGAL', 'FINANCIAL']).default('ALL'),
  requiresConfirmation: z.boolean().default(true),
  autoReminder: z.boolean().default(true),
  sendNow: z.boolean().default(false),
  channels: z.array(z.enum(['notification', 'email'])).default(['notification']),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: 'NOTICE', label: 'Aviso' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'INFORMATIVE', label: 'Informativo' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'PHOTO', label: 'Foto' },
  { value: 'EXAM', label: 'Prova' },
  { value: 'MEETING', label: 'Reunião' },
];

type ClassOption = { id: string; name: string; grade?: string };
type StudentOption = { id: string; name: string; class?: { name: string; grade?: string } };

const MIN_SEARCH = 2;

export default function NewCommunicationPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Armazena label dos itens selecionados para exibir mesmo sem busca ativa
  const [selectedClassMap, setSelectedClassMap] = useState<Record<string, ClassOption>>({});
  const [selectedStudentMap, setSelectedStudentMap] = useState<Record<string, StudentOption>>({});

  const classSearchActive = classSearch.trim().length >= MIN_SEARCH;
  const studentSearchActive = studentSearch.trim().length >= MIN_SEARCH;

  const { data: classesData = [], isFetching: fetchingClasses } = useQuery<ClassOption[]>({
    queryKey: ['classes-search', classSearch.trim()],
    queryFn: () => classesApi.list({ limit: 50, search: classSearch.trim() }).then((r) => r.data?.data ?? r.data),
    enabled: classSearchActive,
  });

  const { data: studentsData = [], isFetching: fetchingStudents } = useQuery<StudentOption[]>({
    queryKey: ['students-search', studentSearch.trim()],
    queryFn: () => studentsApi.list({ limit: 100, search: studentSearch.trim() }).then((r) => r.data?.data ?? r.data),
    enabled: studentSearchActive,
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      schoolType: 'NOTICE',
      scope: 'CLASS',
      audienceFilter: 'ALL' as 'ALL' | 'LEGAL' | 'FINANCIAL',
      requiresConfirmation: true,
      autoReminder: true,
      sendNow: false,
      channels: ['notification'] as ('notification' | 'email')[],
      targetIds: [],
      eventDate: '',
    },
  });

  const scope = watch('scope');
  const targetIds = watch('targetIds');
  const schoolType = watch('schoolType');
  const needsEventDate = schoolType === 'EXAM' || schoolType === 'MEETING';
  const sendNow = watch('sendNow');
  const channels = watch('channels') ?? ['notification'];

  function toggleChannel(c: 'notification' | 'email') {
    const current = channels;
    const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    setValue('channels', next as ('notification' | 'email')[]);
  }

  // Reset selections when scope changes
  useEffect(() => {
    setValue('targetIds', []);
  }, [scope, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => communicationsApi.create({
      ...data,
      eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : undefined,
    }),
    onSuccess: () => router.push('/dashboard/communications'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao criar comunicado');
    },
  });

  function toggleTarget(id: string, item?: ClassOption | StudentOption) {
    const current = targetIds ?? [];
    if (current.includes(id)) {
      setValue('targetIds', current.filter((t) => t !== id));
      setSelectedClassMap((m) => { const n = { ...m }; delete n[id]; return n; });
      setSelectedStudentMap((m) => { const n = { ...m }; delete n[id]; return n; });
    } else {
      setValue('targetIds', [...current, id]);
      if (item) {
        if (scope === 'CLASS') setSelectedClassMap((m) => ({ ...m, [id]: item as ClassOption }));
        else setSelectedStudentMap((m) => ({ ...m, [id]: item as StudentOption }));
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Novo comunicado</h1>
          <p className="text-sm text-gray-500">Crie e envie um comunicado para responsáveis</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700">Conteúdo</h2>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              {...register('schoolType')}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors.schoolType && <p className="mt-1 text-xs text-red-600">{errors.schoolType.message}</p>}
          </div>

          {/* Event Date — only for EXAM and MEETING */}
          {needsEventDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {schoolType === 'EXAM' ? 'Data da prova' : 'Data da reunião'}
              </label>
              <Controller name="eventDate" control={control} render={({ field }) => (
                <DateInput value={field.value ?? ''} onChange={field.onChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              )} />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              {...register('title')}
              type="text"
              placeholder="Ex: Reunião de pais - 3º Ano A"
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                errors.title ? 'border-red-300' : 'border-gray-300',
              )}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              {...register('body')}
              rows={5}
              placeholder="Escreva o conteúdo do comunicado..."
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none',
                errors.body ? 'border-red-300' : 'border-gray-300',
              )}
            />
            {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
          </div>
        </div>

        {/* Scope + Targets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700">Destinatários</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Escopo</label>
            <div className="flex gap-3">
              {['CLASS', 'STUDENT'].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    {...register('scope')}
                    value={s}
                    className="accent-primary-600"
                  />
                  <span className="text-sm text-gray-700">{s === 'CLASS' ? 'Por turma' : 'Por aluno'}</span>
                </label>
              ))}
            </div>
          </div>

          {scope === 'CLASS' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Turmas</label>

              {/* Selecionadas */}
              {Object.values(selectedClassMap).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.values(selectedClassMap).map((cls) => (
                    <span key={cls.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                      {cls.name}{cls.grade && ` — ${cls.grade}`}
                      <button type="button" onClick={() => toggleTarget(cls.id)} className="hover:text-primary-900">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Digite ao menos 2 caracteres para buscar turmas..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {classSearchActive && (
                <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {fetchingClasses ? (
                    <p className="text-xs text-gray-400 text-center py-3">Buscando...</p>
                  ) : classesData.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhuma turma encontrada</p>
                  ) : (
                    classesData
                      .filter((cls) => !selectedClassMap[cls.id])
                      .map((cls) => (
                        <label key={cls.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={targetIds?.includes(cls.id) ?? false}
                            onChange={() => toggleTarget(cls.id, cls)}
                            className="accent-primary-600"
                          />
                          <span className="text-sm text-gray-700">{cls.name}{cls.grade && ` — ${cls.grade}`}</span>
                        </label>
                      ))
                  )}
                </div>
              )}

              {errors.targetIds && <p className="mt-1 text-xs text-red-600">{errors.targetIds.message}</p>}
            </div>
          )}

          {scope === 'STUDENT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alunos</label>

              {/* Selecionados */}
              {Object.values(selectedStudentMap).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.values(selectedStudentMap).map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                      {s.name}
                      <button type="button" onClick={() => toggleTarget(s.id)} className="hover:text-primary-900">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Digite ao menos 2 caracteres para buscar alunos..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {studentSearchActive && (
                <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {fetchingStudents ? (
                    <p className="text-xs text-gray-400 text-center py-3">Buscando...</p>
                  ) : studentsData.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhum aluno encontrado</p>
                  ) : (
                    studentsData
                      .filter((s) => !selectedStudentMap[s.id])
                      .map((student) => (
                        <label key={student.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={targetIds?.includes(student.id) ?? false}
                            onChange={() => toggleTarget(student.id, student)}
                            className="accent-primary-600"
                          />
                          <span className="text-sm text-gray-700">
                            {student.name}
                            {student.class && <span className="text-gray-400 text-xs ml-1">· {student.class.name}{student.class.grade && ` ${student.class.grade}`}</span>}
                          </span>
                        </label>
                      ))
                  )}
                </div>
              )}

              {errors.targetIds && <p className="mt-1 text-xs text-red-600">{errors.targetIds.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Público-alvo</label>
            <select
              {...register('audienceFilter')}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">Todos os responsáveis</option>
              <option value="LEGAL">Somente responsáveis legais</option>
              <option value="FINANCIAL">Somente responsáveis financeiros</option>
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">Opções</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('requiresConfirmation')} className="accent-primary-600" />
            <span className="text-sm text-gray-700">Exigir confirmação de leitura</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('autoReminder')} className="accent-primary-600" />
            <span className="text-sm text-gray-700">Enviar lembrete automático após 24h</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('sendNow')} className="accent-primary-600" />
            <span className="text-sm text-gray-700 font-medium">Enviar imediatamente</span>
          </label>
          {sendNow && (
            <div className="ml-6 pl-3 border-l-2 border-gray-200 space-y-2">
              <p className="text-xs font-medium text-gray-500">Canais de entrega</p>
              {([['notification', Bell, 'Notificação no app/web'], ['email', Mail, 'E-mail']] as const).map(([c, Icon, label]) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} className="accent-primary-600" />
                  <Icon size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium',
              'hover:bg-primary-700 transition-colors disabled:opacity-70',
            )}
          >
            {watch('sendNow') ? <Send size={16} /> : <Save size={16} />}
            {createMutation.isPending ? 'Salvando...' : watch('sendNow') ? 'Enviar' : 'Salvar rascunho'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
