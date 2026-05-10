'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaApi, classesApi } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(300),
  description: z.string().optional(),
  eventType: z.enum(['EXAM', 'PARENT_MEETING', 'FIELD_TRIP', 'HOLIDAY', 'CULTURAL', 'OTHER']),
  subject: z.string().optional(),
  location: z.string().optional(),
  startsAt: z.string().min(1, 'Data de início obrigatória'),
  endsAt: z.string().optional(),
  allDay: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  classIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma turma'),
});
type FormData = z.infer<typeof schema>;

const EVENT_TYPE_LABELS: Record<string, string> = {
  EXAM: 'Prova', PARENT_MEETING: 'Reunião de Pais', FIELD_TRIP: 'Passeio',
  HOLIDAY: 'Feriado', CULTURAL: 'Evento Cultural', OTHER: 'Outro',
};

export default function NewEventPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const { data: classesData } = useQuery({
    queryKey: ['classes', { limit: 200 }],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
  });
  const classes = classesData?.data ?? [];

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { eventType: 'OTHER', allDay: false, isImportant: false, classIds: [] },
  });

  function toggleClass(id: string) {
    const next = selectedClasses.includes(id) ? selectedClasses.filter((c) => c !== id) : [...selectedClasses, id];
    setSelectedClasses(next);
    setValue('classIds', next);
  }

  async function onSubmit(data: FormData) {
    setError('');
    try {
      const toISO = (dt: string) => new Date(dt).toISOString();
      await agendaApi.create({
        ...data,
        startsAt: toISO(data.startsAt),
        endsAt: data.endsAt ? toISO(data.endsAt) : undefined,
        description: data.description || undefined,
        subject: data.subject || undefined,
        location: data.location || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['agenda'] });
      router.push('/dashboard/agenda');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao criar evento.');
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Novo evento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Criar evento na agenda escolar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input {...register('title')} placeholder="Ex: Prova de Matemática"
              className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none', errors.title ? 'border-red-300' : 'border-gray-300')} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select {...register('eventType')} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
              <input {...register('subject')} placeholder="Ex: Matemática"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
              <input {...register('startsAt')} type="datetime-local"
                className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none', errors.startsAt ? 'border-red-300' : 'border-gray-300')} />
              {errors.startsAt && <p className="mt-1 text-xs text-red-600">{errors.startsAt.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
              <input {...register('endsAt')} type="datetime-local"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <input {...register('location')} placeholder="Ex: Sala 10, Auditório..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea {...register('description')} rows={3} placeholder="Detalhes do evento..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input {...register('allDay')} type="checkbox" className="rounded" /> Dia inteiro
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input {...register('isImportant')} type="checkbox" className="rounded" /> Importante
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Turmas *</label>
            {errors.classIds && <p className="text-xs text-red-600">{errors.classIds.message}</p>}
          </div>
          {classes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma turma cadastrada</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classes.map((c: { id: string; name: string }) => (
                <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-sm border transition-colors', selectedClasses.includes(c.id) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300')}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
            {isSubmitting ? 'Criando...' : 'Criar evento'}
          </button>
        </div>
      </form>
    </div>
  );
}
