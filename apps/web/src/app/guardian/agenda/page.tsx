'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { agendaApi, guardiansApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MapPin, Loader2, BookOpen, Users, Bus, Landmark, Mic, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_ICONS: Record<string, React.ElementType> = {
  EXAM: BookOpen,
  PARENT_MEETING: Users,
  FIELD_TRIP: Bus,
  HOLIDAY: Landmark,
  CULTURAL: Mic,
  OTHER: Star,
};

const EVENT_LABELS: Record<string, string> = {
  EXAM: 'Prova',
  PARENT_MEETING: 'Reunião',
  FIELD_TRIP: 'Excursão',
  HOLIDAY: 'Feriado',
  CULTURAL: 'Evento cultural',
  OTHER: 'Evento',
};

const EVENT_COLORS: Record<string, string> = {
  EXAM: '#ef4444',
  PARENT_MEETING: '#8b5cf6',
  FIELD_TRIP: '#10b981',
  HOLIDAY: '#f59e0b',
  CULTURAL: '#0ea5e9',
  OTHER: '#6366f1',
};

function dateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  if (isThisWeek(d, { weekStartsOn: 0 })) return format(d, "EEEE", { locale: ptBR });
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

type AgendaEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  allDay: boolean;
  isImportant: boolean;
  eventType: string;
  school?: { name: string };
};

export default function GuardianAgendaPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.push('/guardian');
  }, [router]);

  const { data: schools = [] } = useQuery({
    queryKey: ['guardian-my-schools'],
    queryFn: () => guardiansApi.mySchools().then((r) => r.data),
    enabled: isAuthenticated(),
  });

  const { data: events = [], isLoading } = useQuery<AgendaEvent[]>({
    queryKey: ['guardian-agenda'],
    queryFn: () => agendaApi.guardianFeed({ days: 60 }).then((r) => r.data),
    enabled: isAuthenticated(),
  });

  // Group events by date label
  const grouped = events.reduce<Record<string, AgendaEvent[]>>((acc, ev) => {
    const key = dateLabel(ev.startsAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const accentColor = (schools as { preference?: { color: string } }[])[0]?.preference?.color ?? '#6366f1';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 pb-3 max-w-lg mx-auto">
        <h1 className="font-bold text-gray-900 text-base">Agenda</h1>
        <p className="text-xs text-gray-500">Próximos 60 dias</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-indigo-400" />
            </div>
            <p className="text-gray-700 font-semibold">Sem eventos próximos</p>
            <p className="text-gray-400 text-sm mt-1">Novos eventos aparecerão aqui</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateKey, dayEvents]) => (
            <div key={dateKey}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{dateKey}</p>
              <div className="space-y-2">
                {dayEvents.map((ev) => {
                  const color = EVENT_COLORS[ev.eventType] ?? '#6366f1';
                  const Icon = EVENT_ICONS[ev.eventType] ?? Star;
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        'bg-white rounded-xl border-l-4 p-4',
                        ev.isImportant ? 'shadow-md' : 'shadow-sm',
                      )}
                      style={{ borderLeftColor: color }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon size={16} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${color}18`, color }}
                            >
                              {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                            </span>
                            {ev.isImportant && (
                              <span className="text-[10px] font-semibold text-orange-500">● Importante</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{ev.title}</p>
                          {ev.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              {ev.allDay
                                ? 'Dia todo'
                                : format(new Date(ev.startsAt), 'HH:mm', { locale: ptBR })}
                              {ev.endsAt && !ev.allDay && ` – ${format(new Date(ev.endsAt), 'HH:mm', { locale: ptBR })}`}
                            </span>
                            {ev.location && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <MapPin size={10} /> {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
