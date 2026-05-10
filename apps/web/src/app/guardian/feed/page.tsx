'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationsApi, guardiansApi } from '@/lib/api';
import { isAuthenticated, getUser } from '@/lib/auth';
import { formatDateTime, commTypeLabel, cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Bell, Palette, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';

const COLOR_PALETTE = [
  '#6366f1', '#10b981', '#0ea5e9', '#8b5cf6',
  '#f43f5e', '#f59e0b', '#14b8a6', '#f97316',
];

type SchoolEntry = {
  school: { id: string; name: string; logoUrl: string | null };
  students: { id: string; name: string; className: string; grade: string; relationship: string }[];
  preference: { color: string; nickname: string | null };
};

type Attachment = { id: string; filename: string; contentType: string };

type FeedItem = {
  id: string;
  title: string;
  body: string;
  schoolType: string;
  schoolId: string;
  school: { id: string; name: string };
  isRead: boolean;
  sentAt: string;
  requiresConfirmation: boolean;
  commStudents: { studentId: string }[];
  attachments?: Attachment[];
  _count?: { attachments: number };
};

export default function GuardianFeedPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.push('/guardian');
    else setUser(getUser());
  }, [router]);

  const { data: schools = [], isLoading: loadingSchools } = useQuery<SchoolEntry[]>({
    queryKey: ['guardian-my-schools'],
    queryFn: () => guardiansApi.mySchools().then((r) => r.data),
    enabled: !!user,
  });

  const activeSchool = schools.find((s) => s.school.id === activeSchoolId) ?? null;
  const accentColor = activeSchool?.preference.color ?? '#6366f1';

  const { data: feed = [], isLoading: loadingFeed } = useQuery<FeedItem[]>({
    queryKey: ['guardian-feed', activeSchoolId],
    queryFn: () => communicationsApi.guardianFeed(activeSchoolId ?? undefined).then((r) => r.data),
    enabled: !!user,
  });

  const readMutation = useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      communicationsApi.confirmRead(id, { studentId, deviceType: 'WEB' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-feed'] }),
  });

  const colorMutation = useMutation({
    mutationFn: ({ schoolId, color }: { schoolId: string; color: string }) =>
      guardiansApi.updateSchoolPreference(schoolId, { color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian-my-schools'] });
      setShowColorPicker(null);
    },
  });

  const unreadCount = feed.filter((c) => !c.isRead).length;
  const visibleFeed = unreadOnly ? feed.filter((c) => !c.isRead) : feed;

  const bgStyle = activeSchoolId
    ? { background: `linear-gradient(160deg, ${accentColor}18 0%, #f9fafb 50%)` }
    : { background: '#f9fafb' };

  return (
    <div className="min-h-screen transition-all duration-500" style={bgStyle}>
      {/* Header — z-30 para ficar acima do overlay (z-20) */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-sm transition-all duration-500"
        style={{
          backgroundColor: activeSchoolId ? `${accentColor}18` : 'rgba(255,255,255,0.95)',
          borderColor: activeSchoolId ? `${accentColor}30` : '#e5e7eb',
        }}
      >
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-bold text-gray-900 text-base">Presente</h1>
              <p className="text-xs text-gray-500">
                Ola, {user?.name?.split(' ')[0] ?? 'Responsavel'}
                {unreadCount > 0 && (
                  <span className="ml-1 font-semibold" style={{ color: accentColor }}>
                    · {unreadCount} novo{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setUnreadOnly((v) => !v)}
              className={cn(
                'relative p-2 rounded-full transition-colors',
                unreadOnly ? 'bg-indigo-50' : 'hover:bg-gray-100',
              )}
              title={unreadOnly ? 'Mostrar todos' : 'Mostrar apenas não lidos'}
            >
              <Bell
                size={20}
                className={unreadCount > 0 ? '' : 'text-gray-400'}
                style={unreadCount > 0 ? { color: accentColor } : undefined}
              />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                  style={{ backgroundColor: accentColor }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* School tabs */}
          {!loadingSchools && schools.length > 0 && (
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => { setActiveSchoolId(null); setShowColorPicker(null); }}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    !activeSchoolId
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  Todas
                </button>

                {schools.map((entry) => {
                  const isActive = activeSchoolId === entry.school.id;
                  const color = entry.preference.color;
                  return (
                    <div key={entry.school.id} className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => { setActiveSchoolId(isActive ? null : entry.school.id); setShowColorPicker(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={isActive
                          ? { backgroundColor: color, color: 'white', boxShadow: `0 2px 8px ${color}60` }
                          : { backgroundColor: `${color}18`, color, border: `1px solid ${color}44` }
                        }
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? 'white' : color }} />
                        {entry.preference.nickname ?? entry.school.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker === entry.school.id ? null : entry.school.id); }}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-100"
                      >
                        <Palette size={11} className="text-gray-400" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Color pickers fora do overflow-x-auto para não serem cortados */}
              {showColorPicker && (() => {
                const entry = schools.find((s) => s.school.id === showColorPicker);
                if (!entry) return null;
                return (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50 w-44">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Cor da escola</p>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          onClick={(e) => { e.stopPropagation(); colorMutation.mutate({ schoolId: entry.school.id, color: hex }); }}
                          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                          style={{
                            backgroundColor: hex,
                            outline: entry.preference.color === hex ? `2px solid ${hex}` : 'none',
                            outlineOffset: '2px',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center leading-tight">
                      {entry.students.map((s) => s.name).join(', ')}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </header>

      {/* Overlay fecha o color picker ao clicar fora */}
      {showColorPicker && (
        <div className="fixed inset-0 z-20" onClick={() => setShowColorPicker(null)} />
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Escola ativa: alunos */}
        {activeSchool && (
          <div
            className="rounded-xl p-3 flex items-center gap-3 transition-all duration-300"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {activeSchool.school.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activeSchool.school.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {activeSchool.students.map((s) => `${s.name} · ${s.grade}`).join('  |  ')}
              </p>
            </div>
          </div>
        )}

        {/* Filtro não lidos ativo */}
        {unreadOnly && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-500">Mostrando apenas não lidos</p>
            <button onClick={() => setUnreadOnly(false)} className="text-xs font-medium" style={{ color: accentColor }}>
              Ver todos
            </button>
          </div>
        )}

        {/* Lista de comunicados */}
        {loadingFeed ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin" style={{ color: accentColor }} />
          </div>
        ) : visibleFeed.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              <CheckCircle2 size={32} style={{ color: accentColor }} />
            </div>
            <p className="text-gray-700 font-semibold">
              {unreadOnly ? 'Tudo lido!' : 'Tudo em dia!'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {unreadOnly ? 'Nenhum comunicado pendente de leitura' : 'Nenhum comunicado recebido'}
            </p>
          </div>
        ) : (
          visibleFeed.map((comm) => {
            const commSchool = schools.find((s) => s.school.id === comm.schoolId);
            const color = commSchool?.preference.color ?? '#6366f1';
            const label = typeof commTypeLabel === 'function' ? commTypeLabel(comm.schoolType) : comm.schoolType;
            const isExpanded = expandedId === comm.id;
            const attachCount = comm._count?.attachments ?? comm.attachments?.length ?? 0;

            return (
              <div
                key={comm.id}
                className={cn(
                  'bg-white rounded-xl border-l-4 transition-all duration-200 overflow-hidden',
                  comm.isRead ? 'opacity-80' : 'shadow-md',
                  isExpanded && 'shadow-lg',
                )}
                style={{ borderLeftColor: color }}
              >
                {/* Cabeçalho clicável */}
                <button
                  className="w-full text-left p-4 focus:outline-none"
                  onClick={() => setExpandedId(isExpanded ? null : comm.id)}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    {!activeSchoolId && commSchool && (
                      <span
                        className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {commSchool.preference.nickname ?? commSchool.school.name}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {!comm.isRead && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      )}
                      {isExpanded
                        ? <ChevronUp size={14} className="text-gray-300 flex-shrink-0" />
                        : <ChevronDown size={14} className="text-gray-300 flex-shrink-0" />
                      }
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{comm.title}</h3>
                  {!isExpanded && (
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{comm.body}</p>
                  )}
                </button>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{comm.body}</p>

                    {attachCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Paperclip size={12} />
                        <span>{attachCount} anexo{attachCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <span className="text-xs text-gray-400">{formatDateTime(comm.sentAt)}</span>
                      {comm.requiresConfirmation && !comm.isRead ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const studentId =
                              comm.commStudents?.[0]?.studentId ??
                              schools.find((s) => s.school.id === comm.schoolId)?.students?.[0]?.id;
                            if (studentId) readMutation.mutate({ id: comm.id, studentId });
                          }}
                          disabled={readMutation.isPending}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                          style={{ backgroundColor: color }}
                        >
                          <CheckCircle2 size={12} />
                          Confirmar leitura
                        </button>
                      ) : comm.isRead ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <CheckCircle2 size={11} className="text-green-500" /> Lido
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Rodapé quando fechado */}
                {!isExpanded && (
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatDateTime(comm.sentAt)}</span>
                    {comm.requiresConfirmation && !comm.isRead ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const studentId =
                            comm.commStudents?.[0]?.studentId ??
                            schools.find((s) => s.school.id === comm.schoolId)?.students?.[0]?.id;
                          if (studentId) readMutation.mutate({ id: comm.id, studentId });
                        }}
                        disabled={readMutation.isPending}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                        style={{ backgroundColor: color }}
                      >
                        <CheckCircle2 size={12} />
                        Confirmar leitura
                      </button>
                    ) : comm.isRead ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <CheckCircle2 size={11} className="text-green-500" /> Lido
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
