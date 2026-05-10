'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, classesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CalendarCheck, Plus, X, Clock, Users, BookUser, Loader2,
  Trash2, Ban, User, Repeat, ChevronDown,
} from 'lucide-react';

type Slot = {
  id: string;
  title: string;
  notes?: string;
  startsAt: string;
  durationMin: number;
  scope: string;
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
  recurrenceGroupId?: string;
  staff: { id: string; name: string; role: string };
  class?: { id: string; name: string; grade: string };
  student?: { id: string; name: string };
  booking?: {
    id: string;
    notes?: string;
    status: string;
    guardian: { id: string; name: string; phone: string };
    student: { id: string; name: string };
  };
};

type Class = { id: string; name: string; grade?: string };

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponível', BOOKED: 'Reservado', CANCELLED: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  BOOKED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DOW_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Modal para escolher modo de cancelamento de série
function CancelGroupModal({
  slot,
  onConfirm,
  onClose,
  pending,
}: {
  slot: Slot;
  onConfirm: (mode: 'this' | 'future' | 'all') => void;
  onClose: () => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<'this' | 'future' | 'all'>('this');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Cancelar horário recorrente</h3>
        <p className="text-sm text-gray-500">
          Este horário faz parte de uma série. O que deseja cancelar?
        </p>
        {(['this', 'future', 'all'] as const).map((m) => (
          <label key={m} className={cn(
            'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
            mode === m ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50',
          )}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)}
              className="accent-primary-600" />
            <span className="text-sm font-medium text-gray-800">
              {m === 'this' && 'Somente este horário'}
              {m === 'future' && 'Este e os próximos da série'}
              {m === 'all' && 'Todos os horários da série'}
            </span>
          </label>
        ))}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => onConfirm(mode)} disabled={pending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {pending && <Loader2 size={13} className="animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');

  // Form — slot único
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [scope, setScope] = useState('ALL');
  const [classId, setClassId] = useState('');

  // Recorrência
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'WEEKLY' | 'BIWEEKLY' | 'DAILY'>('WEEKLY');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceTime, setRecurrenceTime] = useState('16:00');
  const [recurrenceFrom, setRecurrenceFrom] = useState(todayStr());
  const [recurrenceUntil, setRecurrenceUntil] = useState('');

  const [formError, setFormError] = useState('');

  // Estado para modal cancelar grupo
  const [cancelGroupSlot, setCancelGroupSlot] = useState<Slot | null>(null);

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: ['appointments-slots', filterStatus, filterFrom],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterFrom) params.from = new Date(filterFrom).toISOString();
      const res = await appointmentsApi.listSlots(params);
      return res.data;
    },
  });

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ['classes-simple'],
    queryFn: async () => {
      const res = await classesApi.list({ active: true });
      return res.data?.data ?? res.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => appointmentsApi.createSlot(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments-slots'] });
      resetForm();
      setShowForm(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setFormError(e.response?.data?.error ?? 'Erro ao criar horário');
    },
  });

  const cancelGroupMutation = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: 'this' | 'future' | 'all' }) =>
      appointmentsApi.cancelSlotGroup(id, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments-slots'] });
      setCancelGroupSlot(null);
    },
  });

  const cancelSlotMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancelSlot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments-slots'] }),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.deleteSlot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments-slots'] }),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: string) => appointmentsApi.staffCancelBooking(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments-slots'] }),
  });

  function resetForm() {
    setTitle(''); setNotes(''); setStartsAt(''); setDurationMin(30);
    setScope('ALL'); setClassId(''); setFormError('');
    setRecurring(false); setRecurrenceType('WEEKLY'); setRecurrenceDays([]);
    setRecurrenceTime('16:00'); setRecurrenceFrom(todayStr()); setRecurrenceUntil('');
  }

  function toggleDay(d: number) {
    setRecurrenceDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setFormError('Título é obrigatório'); return; }
    if (scope === 'CLASS' && !classId) { setFormError('Selecione a turma'); return; }

    if (recurring) {
      if (!recurrenceFrom) { setFormError('Data de início é obrigatória'); return; }
      if (!recurrenceUntil) { setFormError('Data de término é obrigatória'); return; }
      if (recurrenceType !== 'DAILY' && recurrenceDays.length === 0) {
        setFormError('Selecione ao menos um dia da semana'); return;
      }
      setFormError('');
      createMutation.mutate({
        title: title.trim(),
        notes: notes.trim() || undefined,
        startsAt: `${recurrenceFrom}T${recurrenceTime}:00`,
        durationMin,
        scope,
        classId: scope === 'CLASS' ? classId : undefined,
        recurrenceType,
        recurrenceDays,
        recurrenceTime,
        recurrenceUntil,
      });
    } else {
      if (!startsAt) { setFormError('Data/hora é obrigatória'); return; }
      setFormError('');
      createMutation.mutate({
        title: title.trim(),
        notes: notes.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        durationMin,
        scope,
        classId: scope === 'CLASS' ? classId : undefined,
      });
    }
  }

  function handleCancelSlot(slot: Slot) {
    if (slot.recurrenceGroupId) {
      setCancelGroupSlot(slot);
    } else {
      if (confirm('Cancelar este horário?')) cancelSlotMutation.mutate(slot.id);
    }
  }

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const day = new Date(s.startsAt).toISOString().slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus horários de atendimento</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus size={16} /> Novo Horário
        </button>
      </div>

      {/* Modal criar horário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Novo Horário de Atendimento</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Atendimento — Turma A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Duração */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duração</label>
                <select
                  value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {[15, 20, 30, 45, 60].map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>

              {/* Escopo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quem pode reservar</label>
                <select
                  value={scope} onChange={(e) => { setScope(e.target.value); setClassId(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Todos os responsáveis</option>
                  <option value="CLASS">Responsáveis de uma turma</option>
                </select>
              </div>
              {scope === 'CLASS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                  <select
                    value={classId} onChange={(e) => setClassId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Selecione a turma...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.grade ? ` — ${c.grade}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Toggle recorrência */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRecurring((v) => !v)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors',
                    recurring ? 'bg-primary-50 text-primary-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Repeat size={15} />
                    Horário recorrente
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    recurring ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500',
                  )}>
                    {recurring ? 'Ativado' : 'Desativado'}
                  </span>
                </button>

                {recurring && (
                  <div className="px-4 pb-4 pt-3 space-y-3 border-t border-gray-200">
                    {/* Tipo de recorrência */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Repete</label>
                      <div className="flex gap-2">
                        {(['WEEKLY', 'BIWEEKLY', 'DAILY'] as const).map((t) => (
                          <button
                            key={t} type="button"
                            onClick={() => setRecurrenceType(t)}
                            className={cn(
                              'flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors',
                              recurrenceType === t
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                            )}
                          >
                            {t === 'WEEKLY' ? 'Semanal' : t === 'BIWEEKLY' ? 'Quinzenal' : 'Diário'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dias da semana (semanal/quinzenal) */}
                    {recurrenceType !== 'DAILY' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Dias da semana</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {DOW_LABELS.map((label, d) => (
                            <button
                              key={d} type="button"
                              onClick={() => toggleDay(d)}
                              className={cn(
                                'w-10 h-8 text-xs rounded-lg border font-medium transition-colors',
                                recurrenceDays.includes(d)
                                  ? 'border-primary-500 bg-primary-500 text-white'
                                  : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {recurrenceDays.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {recurrenceDays.sort().map((d) => DOW_FULL[d]).join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Horário */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Horário</label>
                      <input
                        type="time" value={recurrenceTime}
                        onChange={(e) => setRecurrenceTime(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Período */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">A partir de</label>
                        <input
                          type="date" value={recurrenceFrom}
                          onChange={(e) => setRecurrenceFrom(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Até</label>
                        <input
                          type="date" value={recurrenceUntil}
                          onChange={(e) => setRecurrenceUntil(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* Preview da série */}
                    {recurrenceDays.length > 0 && recurrenceUntil && recurrenceType !== 'DAILY' && (
                      <p className="text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-2">
                        Toda {recurrenceType === 'BIWEEKLY' ? 'quinzena' : 'semana'} às {recurrenceTime} nas{' '}
                        {recurrenceDays.sort().map((d) => DOW_FULL[d]).join(', ')}, até{' '}
                        {new Date(recurrenceUntil + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {recurrenceType === 'DAILY' && recurrenceUntil && (
                      <p className="text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-2">
                        Todos os dias às {recurrenceTime}, de{' '}
                        {new Date(recurrenceFrom + 'T12:00:00').toLocaleDateString('pt-BR')} até{' '}
                        {new Date(recurrenceUntil + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}

                {/* Data/hora — slot único */}
                {!recurring && (
                  <div className="px-4 pb-4 pt-3 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
                    <input
                      type="datetime-local" value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={2} placeholder="Notas internas..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {recurring ? 'Criar Série' : 'Criar Horário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cancelar série */}
      {cancelGroupSlot && (
        <CancelGroupModal
          slot={cancelGroupSlot}
          pending={cancelGroupMutation.isPending}
          onClose={() => setCancelGroupSlot(null)}
          onConfirm={(mode) => cancelGroupMutation.mutate({ id: cancelGroupSlot.id, mode })}
        />
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos os status</option>
          <option value="AVAILABLE">Disponível</option>
          <option value="BOOKED">Reservado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <input
          type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {(filterStatus || filterFrom) && (
          <button onClick={() => { setFilterStatus(''); setFilterFrom(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarCheck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum horário criado ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Novo Horário" para disponibilizar um atendimento.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([day, daySlots]) => (
            <div key={day}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {formatDate(day + 'T12:00:00')}
              </h3>
              <div className="space-y-3">
                {daySlots.map((slot) => (
                  <div key={slot.id} className={cn(
                    'bg-white rounded-xl border p-4',
                    slot.status === 'CANCELLED' ? 'border-gray-200 opacity-60' : 'border-gray-200',
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{slot.title}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[slot.status])}>
                            {STATUS_LABEL[slot.status]}
                          </span>
                          {slot.recurrenceGroupId && (
                            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                              <Repeat size={10} /> Recorrente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} /> {formatTime(slot.startsAt)} · {slot.durationMin} min
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User size={12} /> {slot.staff.name}
                          </span>
                          {slot.class && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users size={12} /> {slot.class.name}
                            </span>
                          )}
                        </div>

                        {slot.booking && (
                          <div className={cn(
                            'mt-3 p-3 rounded-lg text-sm',
                            slot.booking.status === 'CANCELLED' ? 'bg-gray-50 text-gray-500' : 'bg-blue-50',
                          )}>
                            <p className="font-medium text-blue-800">
                              Reservado por: {slot.booking.guardian.name || slot.booking.guardian.phone}
                            </p>
                            <p className="text-blue-600 text-xs mt-0.5">Aluno: {slot.booking.student.name}</p>
                            {slot.booking.notes && (
                              <p className="text-blue-600 text-xs mt-0.5 italic">"{slot.booking.notes}"</p>
                            )}
                            {slot.booking.status === 'CONFIRMED' && (
                              <button
                                onClick={() => cancelBookingMutation.mutate(slot.booking!.id)}
                                disabled={cancelBookingMutation.isPending}
                                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                              >
                                Cancelar agendamento
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {slot.status === 'AVAILABLE' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCancelSlot(slot)}
                            disabled={cancelSlotMutation.isPending || cancelGroupMutation.isPending}
                            title="Cancelar horário"
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Ban size={15} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Excluir este horário permanentemente?')) deleteSlotMutation.mutate(slot.id); }}
                            disabled={deleteSlotMutation.isPending}
                            title="Excluir horário"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
