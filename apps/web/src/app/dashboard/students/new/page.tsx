'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsApi, classesApi } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClassCombobox from '@/components/ClassCombobox';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório (mín. 2 caracteres)'),
  classId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  enrollmentCode: z.string().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  gender: z.enum(['masculino', 'feminino', 'outro', 'nao_informado', '']).optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('classId') ?? '';
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['classes', { limit: 200 }],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
  });
  const classes = classesData?.data ?? [];

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: '', classId: preselectedClassId },
  });

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await studentsApi.create({
        name: data.name,
        classId: data.classId,
        enrollmentCode: data.enrollmentCode || undefined,
        birthDate: data.birthDate || undefined,
        gender: data.gender || undefined,
        notes: data.notes || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['students'] });
      await qc.invalidateQueries({ queryKey: ['class-students', preselectedClassId] });
      router.push(preselectedClassId ? `/dashboard/classes/${preselectedClassId}` : '/dashboard/students');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao cadastrar aluno.');
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Novo aluno</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastrar novo aluno</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input {...register('name')} placeholder="Nome do aluno"
              className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none', errors.name ? 'border-red-300' : 'border-gray-300')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          {!preselectedClassId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <ClassCombobox
                options={classes}
                value={watch('classId') ?? ''}
                onChange={(v) => setValue('classId', v || undefined)}
                placeholder="Sem turma"
                emptyLabel="Sem turma"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
              <input {...register('enrollmentCode')} placeholder="Cód. matrícula"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
              <input {...register('birthDate')} type="date"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <select {...register('gender')} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
              <option value="">Não informado</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
              <option value="nao_informado">Prefiro não informar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea {...register('notes')} rows={3} placeholder="Informações adicionais..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none" />
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar aluno'}
          </button>
        </div>
      </form>
    </div>
  );
}
