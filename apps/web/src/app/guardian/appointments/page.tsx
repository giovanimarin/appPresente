'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, guardiansApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { CalendarCheck, Clock, User, ChevronRight, X, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvailableSlot = {
  id: string;
  title: string;
  notes?: string;
  startsAt: string;
  durationMin: number;
  scope: string;
  staff: { id: string; name: string; role: string };
  class?: { id: string; name: string; grade: string };
};

type Booking = {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  cancelledAt?: string;
  slot: {
    id: string;
    title: string;
    startsAt: string;
    durationMin: number;
    staff: { id: string; name: string; role: string };
    school: { id: string; name: string; logoUrl?: string };
  };
  student: { id: string; name: string };
};

type Student = { id: string; name: string };

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Diretor(a)', SECRETARY: 'Secretaria',
  COORDINATOR: 'Coordenador(a)', TEACHER: 'Professor(a)',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function GuardianAppointmentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const [bookingSlot, setBookingSlot] = useState<AvailableSlot | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) router.push('/guardian');
  }, [router]);

  const { data: myStudents = [] } = useQuery<Student[]>({
    queryKey: ['guardian-students'],
    queryFn: async () => {
      const r = await guardiansApi.getMe();
      return (r.data?.studentGuardians ?? []).map((sg: { student: Student }) => sg.student);
    },
    enabled: isAuthenticated(),
  });

  const { data: available = [], isLoading: loadingAvailable } = useQuery<AvailableSlot[]>({
    queryKey: ['guardian-available-slots'],
    queryFn: () => appointmentsApi.listAvailable().then((r) => r.data),
    enabled: isAuthenticated() && tab === 'available',
  });

  const { data: myBookings = [], isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ['guardian-my-bookings'],
    queryFn: () => appointmentsApi.listMyBookings().then((r) => r.data),
    enabled: isAuthenticated() && tab === 'mine',
  });

  const bookMutation = useMutation({
    mutationFn: (data: unknown) => appointmentsApi.book(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian-available-slots'] });
      qc.invalidateQueries({ queryKey: ['guardian-my-bookings'] });
      setBookingSlot(null);
      setBookingNotes('');
      setSelectedStudentId('');
      setSuccessMsg('Agendamento confirmado!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setBookingError(e.response?.data?.error ?? 'Erro ao agendar');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancelMyBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-my-bookings'] }),
  });

  function openBooking(slot: AvailableSlot) {
    setBookingSlot(slot);
    setBookingNotes('');
    setBookingError('');
    setSelectedStudentId(myStudents.length === 1 ? myStudents[0].id : '');
  }

  function submitBooking() {
    if (!selectedStudentId) { setBookingError('Selecione o aluno'); return; }
    setBookingError('');
    bookMutation.mutate({ slotId: bookingSlot!.id, studentId: selectedStudentId, notes: bookingNotes });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agende um horário com a escola</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mx-4 mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100">
        {(['available', 'mine'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500',
            )}
          >
            {t === 'available' ? 'Horários Disponíveis' : 'Meus Agendamentos'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {/* Available slots */}
        {tab === 'available' && (
          loadingAvailable ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum horário disponível no momento.</p>
            </div>
          ) : available.map((slot) => (
            <button
              key={slot.id}
              onClick={() => openBooking(slot)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{slot.title}</p>
                  <p className="text-xs text-indigo-600 font-medium mt-0.5">
                    {formatDate(slot.startsAt)} às {formatTime(slot.startsAt)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} /> {slot.durationMin} min
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <User size={11} /> {slot.staff.name} · {ROLE_LABELS[slot.staff.role] ?? slot.staff.role}
                    </span>
                  </div>
                  {slot.class && (
                    <p className="text-xs text-gray-400 mt-0.5">Turma: {slot.class.name}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0 mt-1" />
              </div>
            </button>
          ))
        )}

        {/* My bookings */}
        {tab === 'mine' && (
          loadingBookings ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum agendamento ainda.</p>
            </div>
          ) : myBookings.map((booking) => (
            <div
              key={booking.id}
              className={cn(
                'bg-white rounded-xl border p-4',
                booking.status === 'CANCELLED' ? 'border-gray-200 opacity-60' : 'border-gray-200',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm truncate">{booking.slot.title}</p>
                    <span className={cn(
                      'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                      booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {booking.status === 'CONFIRMED' ? 'Confirmado' : 'Cancelado'}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 font-medium mt-0.5">
                    {formatDate(booking.slot.startsAt)} às {formatTime(booking.slot.startsAt)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      {booking.slot.staff.name} · {ROLE_LABELS[booking.slot.staff.role] ?? booking.slot.staff.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Aluno: {booking.student.name}</p>
                  <p className="text-xs text-gray-400">Escola: {booking.slot.school.name}</p>
                  {booking.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">"{booking.notes}"</p>
                  )}
                </div>
              </div>
              {booking.status === 'CONFIRMED' && new Date(booking.slot.startsAt) > new Date() && (
                <button
                  onClick={() => { if (confirm('Cancelar este agendamento?')) cancelMutation.mutate(booking.id); }}
                  disabled={cancelMutation.isPending}
                  className="mt-3 text-xs text-red-600 hover:text-red-700 underline"
                >
                  Cancelar agendamento
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Booking modal */}
      {bookingSlot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold">Confirmar Agendamento</h2>
              <button onClick={() => setBookingSlot(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="font-medium text-indigo-900">{bookingSlot.title}</p>
                <p className="text-sm text-indigo-700 mt-1">
                  {formatDate(bookingSlot.startsAt)} às {formatTime(bookingSlot.startsAt)}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  {bookingSlot.staff.name} · {ROLE_LABELS[bookingSlot.staff.role] ?? bookingSlot.staff.role}
                  {' · '}{bookingSlot.durationMin} min
                </p>
              </div>

              {myStudents.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione o aluno...</option>
                    {myStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {myStudents.length === 1 && (
                <p className="text-sm text-gray-600">
                  Aluno: <span className="font-medium">{myStudents[0].name}</span>
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={2}
                  placeholder="Assunto que deseja tratar..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setBookingSlot(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={submitBooking} disabled={bookMutation.isPending}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {bookMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
