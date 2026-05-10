'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PhoneInput from '@/components/PhoneInput';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { schoolsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';

const schema = z.object({
  name: z.string().min(1).max(200),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  const { data: school, isLoading } = useQuery({
    queryKey: ['school'],
    queryFn: () => schoolsApi.get().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (school) {
      reset({
        name: school.name ?? '',
        cnpj: school.cnpj ?? '',
        address: school.address ?? '',
        city: school.city ?? '',
        state: school.state ?? '',
        phone: school.phone ?? '',
        email: school.email ?? '',
      });
      if (school.logoDownloadUrl) setLogoPreview(school.logoDownloadUrl);
    }
  }, [school, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => schoolsApi.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school'] }),
  });

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLogoError('Selecione uma imagem válida'); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Imagem deve ter no máximo 2MB'); return; }
    setLogoError('');
    setLogoUploading(true);
    try {
      const { data } = await schoolsApi.requestLogoUpload(file.name, file.type);
      await axios.put(data.uploadUrl, file, { headers: { 'Content-Type': file.type } });
      await schoolsApi.update({ logoUrl: data.key });
      setLogoPreview(URL.createObjectURL(file));
      qc.invalidateQueries({ queryKey: ['school'] });
    } catch {
      setLogoError('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    await schoolsApi.update({ logoUrl: '' });
    setLogoPreview(null);
    qc.invalidateQueries({ queryKey: ['school'] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações da Escola</h1>
        <p className="text-sm text-gray-500 mt-0.5">Informações gerais da sua escola</p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Logo da escola</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo" width={80} height={80} className="w-full h-full object-contain" unoptimized />
            ) : (
              <span className="text-2xl font-bold text-gray-300">{school?.name?.[0]?.toUpperCase() ?? 'E'}</span>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {logoUploading ? 'Enviando...' : 'Alterar logo'}
              </button>
              {logoPreview && (
                <button type="button" onClick={handleRemoveLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-100 rounded-lg text-sm text-red-500 hover:bg-red-50">
                  <X size={14} /> Remover
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">PNG, JPG ou WebP — máximo 2MB</p>
            {logoError && <p className="text-xs text-red-600">{logoError}</p>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da escola</label>
            <input
              {...register('name')}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500',
                errors.name ? 'border-red-300' : 'border-gray-300',
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input
              {...register('cnpj')}
              placeholder="00.000.000/0000-00"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <PhoneInput
                {...register('phone')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                {...register('email')}
                type="email"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500',
                  errors.email ? 'border-red-300' : 'border-gray-300',
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input
              {...register('address')}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                {...register('city')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                {...register('state')}
                maxLength={2}
                placeholder="SP"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm uppercase focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors',
              (!isDirty || updateMutation.isPending) && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {updateMutation.isSuccess && (
          <p className="text-sm text-green-600">Alterações salvas com sucesso!</p>
        )}
        {updateMutation.isError && (
          <p className="text-sm text-red-600">Erro ao salvar. Verifique os dados e tente novamente.</p>
        )}
      </form>
    </div>
  );
}
