'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi, usersApi, roomsApi } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SearchableSelect from '@/components/SearchableSelect';

const SHIFTS = [
  { value: 'MATUTINO', label: 'Matutino' },
  { value: 'VESPERTINO', label: 'Vespertino' },
  { value: 'NOTURNO', label: 'Noturno' },
  { value: 'INTEGRAL', label: 'Integral' },
];

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  grade: z.string().optional(),
  shift: z.enum(['MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL', 'manha', 'tarde', 'integral', 'noturno', '']).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional().or(z.literal(0)),
  roomId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  coordinatorId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
});
type FormData = z.infer<typeof schema>;

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', params.id],
    queryFn: () => classesApi.get(params.id).then((r) => r.data),
  });
  const { data: usersData } = useQuery({
    queryKey: ['users', false],
    queryFn: () => usersApi.list({ limit: 200 }).then((r) => r.data),
  });
  const coordinators = usersData?.data?.filter((u: { role: string }) => u.role === 'COORDINATOR') ?? [];

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list().then((r) => r.data),
  });
  const rooms: { id: string; name: string }[] = Array.isArray(roomsData) ? roomsData : (roomsData?.data ?? []);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const coordinatorId = watch('coordinatorId');
  const roomId = watch('roomId');

  useEffect(() => {
    if (cls) {
      reset({
        name: cls.name,
        grade: cls.grade ?? '',
        shift: cls.shift ?? '',
        year: cls.year ?? 0,
        roomId: cls.roomId ?? '',
        coordinatorId: cls.coordinator?.id ?? '',
      });
    }
  }, [cls, reset]);

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await classesApi.update(params.id, {
        ...data,
        shift: data.shift || undefined,
        year: data.year || undefined,
        grade: data.grade || undefined,
        roomId: data.roomId || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['classes'] });
      router.push('/dashboard/classes');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao atualizar turma.');
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div><h1 className="text-xl font-bold text-gray-900">Editar turma</h1><p className="text-sm text-gray-500">{cls?.name}</p></div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da turma</label>
            <input {...register('name')} className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none', errors.name ? 'border-red-300' : 'border-gray-300')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série/Ano</label>
              <input {...register('grade')} placeholder="Ex: 3º Ano EF" className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
              <select {...register('shift')} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                <option value="">Não informado</option>
                {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano letivo</label>
              <input {...register('year')} type="number" min={2020} max={2100} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
              <SearchableSelect
                options={rooms.map((r) => ({ id: r.id, label: r.name }))}
                value={roomId ?? ''}
                onChange={(v) => setValue('roomId', v || undefined, { shouldDirty: true })}
                emptyLabel="Nenhuma"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coordenador responsável</label>
            <SearchableSelect
              options={coordinators.map((u: { id: string; name: string }) => ({ id: u.id, label: u.name }))}
              value={coordinatorId ?? ''}
              onChange={(v) => setValue('coordinatorId', v || undefined, { shouldDirty: true })}
              emptyLabel="Nenhum"
            />
          </div>
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting || !isDirty} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
