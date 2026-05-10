'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
type FieldType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DATE' | 'FILE';
type Field = { id: string; type: FieldType; label: string; required: boolean; options: string[]; placeholder: string };

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Texto curto', TEXTAREA: 'Texto longo', SELECT: 'Lista de opções',
  CHECKBOX: 'Caixa de seleção', DATE: 'Data', FILE: 'Arquivo',
};

function uid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function defaultField(): Field {
  return { id: uid(), type: 'TEXT', label: '', required: false, options: [], placeholder: '' };
}

export default function NewFormPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [fields, setFields] = useState<Field[]>([defaultField()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addField() {
    setFields((prev) => [...prev, defaultField()]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function addOption(fieldId: string) {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, options: [...f.options, ''] } : f)));
  }

  function updateOption(fieldId: string, idx: number, val: string) {
    setFields((prev) => prev.map((f) => {
      if (f.id !== fieldId) return f;
      const opts = [...f.options];
      opts[idx] = val;
      return { ...f, options: opts };
    }));
  }

  function removeOption(fieldId: string, idx: number) {
    setFields((prev) => prev.map((f) => {
      if (f.id !== fieldId) return f;
      return { ...f, options: f.options.filter((_, i) => i !== idx) };
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Título obrigatório.'); return; }
    if (fields.length === 0) { setError('Adicione ao menos 1 campo.'); return; }
    if (fields.some((f) => !f.label.trim())) { setError('Todos os campos precisam ter um rótulo.'); return; }
    setSaving(true);
    try {
      await formsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        fields: fields.map((f) => ({
          id: f.id, type: f.type, label: f.label, required: f.required,
          options: f.type === 'SELECT' ? f.options.filter(Boolean) : undefined,
          placeholder: f.placeholder || undefined,
        })),
      });
      await qc.invalidateQueries({ queryKey: ['forms'] });
      router.push('/dashboard/forms');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao criar formulário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Novo formulário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Criar formulário para responsáveis</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Autorização de Passeio"
              className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none', !title && error ? 'border-red-300' : 'border-gray-300')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Instrução para os responsáveis..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expira em</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Campos do formulário</h2>
            <button type="button" onClick={addField} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600">
              <Plus size={14} /> Adicionar campo
            </button>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-400 font-medium">Campo {idx + 1}</span>
                <div className="flex-1" />
                <button type="button" onClick={() => removeField(field.id)} className="p-1 text-red-400 hover:text-red-600 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FieldType, options: [] })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                    {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rótulo *</label>
                  <input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="Ex: Nome completo"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                </div>
              </div>
              {['TEXT', 'TEXTAREA'].includes(field.type) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                  <input value={field.placeholder} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="Texto de ajuda..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                </div>
              )}
              {field.type === 'SELECT' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Opções</label>
                  {field.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input value={opt} onChange={(e) => updateOption(field.id, oi, e.target.value)} placeholder={`Opção ${oi + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                      <button type="button" onClick={() => removeOption(field.id, oi)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(field.id)} className="text-xs text-primary-600 hover:underline">
                    + Adicionar opção
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="rounded" />
                Campo obrigatório
              </label>
            </div>
          ))}
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Criando...' : 'Criar formulário'}
          </button>
        </div>
      </form>
    </div>
  );
}
