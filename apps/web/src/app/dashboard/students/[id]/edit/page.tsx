'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsApi, classesApi } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SearchableSelect from '@/components/SearchableSelect';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  classId: z.string().uuid('Turma obrigatória'),
  enrollmentCode: z.string().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  gender: z.enum(['masculino', 'feminino', 'outro', 'nao_informado', '']).optional(),
  notes: z.string().optional(),
  cpf: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', params.id],
    queryFn: () => studentsApi.get(params.id).then((r) => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes', false],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const classId = watch('classId');

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 9) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    else if (digits.length > 6) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    else if (digits.length > 3) masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    setCpfDisplay(masked);
    setValue('cpf', digits || undefined, { shouldDirty: true });
  }

  useEffect(() => {
    if (student) {
      const cpfDigits = student.cpf ?? '';
      reset({
        name: student.name,
        classId: student.class?.id ?? '',
        enrollmentCode: student.enrollmentCode ?? '',
        birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
        gender: student.gender ?? '',
        notes: student.notes ?? '',
        cpf: cpfDigits,
      });
      if (cpfDigits) {
        const d = cpfDigits;
        let masked = d;
        if (d.length > 9) masked = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
        else if (d.length > 6) masked = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
        else if (d.length > 3) masked = `${d.slice(0, 3)}.${d.slice(3)}`;
        setCpfDisplay(masked);
      }
    }
  }, [student, reset]);

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await studentsApi.update(params.id, {
        ...data,
        birthDate: data.birthDate || undefined,
        gender: data.gender || undefined,
        enrollmentCode: data.enrollmentCode || undefined,
        notes: data.notes || undefined,
        cpf: data.cpf || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['students'] });
      router.push('/dashboard/students');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao atualizar aluno.');
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div><h1 className="text-xl font-bold text-gray-900">Editar aluno</h1><p className="text-sm text-gray-500">{student?.name}</p></div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input {...register('name')} className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none', errors.name ? 'border-red-300' : 'border-gray-300')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF (opcional)</label>
            <input
              value={cpfDisplay}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
            <SearchableSelect
              options={(classesData?.data ?? []).map((c: { id: string; name: string; grade?: string }) => ({ id: c.id, label: c.name, sublabel: c.grade }))}
              value={classId ?? ''}
              onChange={(v) => setValue('classId', v, { shouldDirty: true, shouldValidate: true })}
              className={errors.classId ? '[&>button]:border-red-300' : ''}
            />
            {errors.classId && <p className="mt-1 text-xs text-red-600">{errors.classId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
              <input {...register('enrollmentCode')} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
              <input {...register('birthDate')} type="date" className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
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
            <textarea {...register('notes')} rows={3} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none" />
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
