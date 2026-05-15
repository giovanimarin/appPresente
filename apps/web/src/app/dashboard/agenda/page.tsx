'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agendaApi, classesApi } from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import { Loader2, Users, List, CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import DateInput from '@/components/DateInput';
import Link from 'next/link';

const EVENT_TYPE_LABELS: Record<string, string> = {
  EXAM: 'Prova', PARENT_MEETING: 'Reunião', FIELD_TRIP: 'Passeio',
  HOLIDAY: 'Feriado', CULTURAL: 'Evento Cultural', OTHER: 'Comunicado',
};
const EVENT_TYPE_COLORS: Record<string, string> = {
  EXAM: 'bg-orange-100 text-orange-700', PARENT_MEETING: 'bg-blue-100 text-blue-700',
  FIELD_TRIP: 'bg-green-100 text-green-700', HOLIDAY: 'bg-gray-100 text-gray-700',
  CULTURAL: 'bg-purple-100 text-purple-700', OTHER: 'bg-indigo-100 text-indigo-700',
};
const EVENT_TYPE_DOT: Record<string, string> = {
  EXAM: 'bg-orange-400', PARENT_MEETING: 'bg-blue-400',
  FIELD_TRIP: 'bg-green-400', HOLIDAY: 'bg-gray-400',
  CULTURAL: 'bg-purple-400', OTHER: 'bg-indigo-400',
};

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

type AgendaEvent = {
  id: string; title: string; eventType: string; startsAt: string;
  description?: string; cancelledAt?: string;
  communicationId?: string;
  eventClasses: { class: { name: string } }[];
};

export default function AgendaPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // list filters
  const [typeFilter, setTypeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calTypeFilter, setCalTypeFilter] = useState('');
  const [calClassFilter, setCalClassFilter] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['classes', false],
    queryFn: () => classesApi.list({ limit: 200 }).then((r) => r.data),
  });
  const classes: { id: string; name: string }[] = classesData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['agenda', { page, typeFilter, classFilter, from, to }],
    queryFn: () => agendaApi.list({ page, limit: 20, eventType: typeFilter || undefined, classId: classFilter || undefined, from: from || undefined, to: to || undefined }).then((r) => r.data),
    enabled: view === 'list',
  });

  const calFrom = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01T00:00:00.000Z`;
  const calLastDay = new Date(calYear, calMonth + 1, 0).getDate();
  const calTo = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(calLastDay).padStart(2, '0')}T23:59:59.999Z`;
  const { data: calData, isLoading: calLoading } = useQuery({
    queryKey: ['agenda-cal', calYear, calMonth, calTypeFilter, calClassFilter],
    queryFn: () => agendaApi.list({ limit: 200, from: calFrom, to: calTo, eventType: calTypeFilter || undefined, classId: calClassFilter || undefined }).then((r) => r.data),
    enabled: view === 'calendar',
  });

  const dayEvents = useMemo(() => {
    const map = new Map<number, AgendaEvent[]>();
    for (const ev of (calData?.data ?? []) as AgendaEvent[]) {
      const d = new Date(ev.startsAt).getUTCDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(ev);
    }
    return map;
  }, [calData]);

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const selectedEvents = selectedDay ? (dayEvents.get(selectedDay) ?? []) : [];

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1);
    setSelectedDay(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Eventos gerados automaticamente pelo sistema</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setView('list')} className={cn('px-3 py-2 text-sm flex items-center gap-1.5', view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
            <List size={14} /> Lista
          </button>
          <button onClick={() => setView('calendar')} className={cn('px-3 py-2 text-sm flex items-center gap-1.5 border-l border-gray-200', view === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
            <CalendarDays size={14} /> Calendário
          </button>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
              <option value="">Todos os tipos</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
              <option value="">Todas as turmas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <DateInput value={from} onChange={(v) => { setFrom(v); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            <DateInput value={to} onChange={(v) => { setTo(v); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            {(typeFilter || classFilter || from || to) && (
              <button onClick={() => { setTypeFilter(''); setClassFilter(''); setFrom(''); setTo(''); setPage(1); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white">
                Limpar
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
            ) : data?.data?.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhum evento encontrado</div>
            ) : data?.data?.map((event: AgendaEvent) => {
              const inner = (
                <>
                  <div className="text-center min-w-[48px]">
                    <p className="text-lg font-bold text-primary-700 leading-none">{new Date(event.startsAt).getUTCDate()}</p>
                    <p className="text-xs text-gray-500 uppercase">{new Date(event.startsAt).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', EVENT_TYPE_COLORS[event.eventType])}>{EVENT_TYPE_LABELS[event.eventType]}</span>
                      {event.cancelledAt && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Cancelado</span>}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{formatDateTime(event.startsAt)}</span>
                      {event.description && <span>{event.description}</span>}
                      {event.eventClasses?.length > 0 && <span className="flex items-center gap-1"><Users size={10} />{event.eventClasses.map((ec) => ec.class.name).join(', ')}</span>}
                    </div>
                  </div>
                  {event.communicationId && <ExternalLink size={14} className="text-indigo-400 flex-shrink-0" />}
                </>
              );
              return event.communicationId ? (
                <Link key={event.id} href={`/dashboard/communications/${event.communicationId}`}
                  className={cn('px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors', event.cancelledAt && 'opacity-50')}>
                  {inner}
                </Link>
              ) : (
                <div key={event.id} className={cn('px-5 py-4 flex items-center gap-4', event.cancelledAt && 'opacity-50')}>
                  {inner}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Próxima</button>
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ─────────────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select value={calTypeFilter} onChange={(e) => { setCalTypeFilter(e.target.value); setSelectedDay(null); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
              <option value="">Todos os tipos</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={calClassFilter} onChange={(e) => { setCalClassFilter(e.target.value); setSelectedDay(null); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
              <option value="">Todas as turmas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {(calTypeFilter || calClassFilter) && (
              <button onClick={() => { setCalTypeFilter(''); setCalClassFilter(''); setSelectedDay(null); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white">
                Limpar
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
              <span className="font-semibold text-gray-900">{MONTHS_PT[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS_PT.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
              ))}
            </div>

            {calLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
            ) : (
              <div className="grid grid-cols-7">
                {calCells.map((day, i) => {
                  const events = day ? (dayEvents.get(day) ?? []) : [];
                  const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  const isSelected = day === selectedDay;
                  return (
                    <div key={i}
                      onClick={() => day && setSelectedDay(isSelected ? null : day)}
                      className={cn(
                        'min-h-[72px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition-colors',
                        !day && 'bg-gray-50/50',
                        day && 'hover:bg-gray-50',
                        isSelected && 'bg-primary-50',
                      )}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1',
                            isToday ? 'bg-primary-600 text-white' : 'text-gray-700',
                          )}>{day}</div>
                          <div className="space-y-0.5">
                            {events.slice(0, 2).map((ev) => (
                              <div key={ev.id} className={cn('text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium', EVENT_TYPE_COLORS[ev.eventType])}>
                                {ev.title}
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-[10px] text-gray-400 pl-1">+{events.length - 2} mais</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedDay && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-gray-900">{selectedDay} de {MONTHS_PT[calMonth]}</h3>
              </div>
              {selectedEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum evento neste dia</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {selectedEvents.map((event) => {
                    const inner = (
                      <>
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', EVENT_TYPE_DOT[event.eventType])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-gray-900">{event.title}</p>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', EVENT_TYPE_COLORS[event.eventType])}>{EVENT_TYPE_LABELS[event.eventType]}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            <span>{formatDateTime(event.startsAt)}</span>
                            {event.description && <span>{event.description}</span>}
                            {event.eventClasses?.length > 0 && <span className="flex items-center gap-1"><Users size={10} />{event.eventClasses.map((ec) => ec.class.name).join(', ')}</span>}
                          </div>
                        </div>
                        {event.communicationId && <ExternalLink size={14} className="text-indigo-400 flex-shrink-0" />}
                      </>
                    );
                    return event.communicationId ? (
                      <Link key={event.id} href={`/dashboard/communications/${event.communicationId}`}
                        className={cn('px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors', event.cancelledAt && 'opacity-50')}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={event.id} className={cn('px-5 py-4 flex items-center gap-4', event.cancelledAt && 'opacity-50')}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
