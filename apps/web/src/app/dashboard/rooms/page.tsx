'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Loader2, Search, Plus, X, DoorOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
import ActionMenu from '@/components/ActionMenu';

type RoomClass = {
  id: string;
  name: string;
  grade: string;
  shift: string;
  _count: { students: number };
};

type Room = {
  id: string;
  name: string;
  capacity?: number | null;
  active: boolean;
  classes: RoomClass[];
};

const SHIFT_LABELS: Record<string, string> = {
  manha: 'Manhã', manhã: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral: 'Integral',
};

const SHIFT_COLORS: Record<string, string> = {
  manha: 'bg-amber-100 text-amber-700',
  manhã: 'bg-amber-100 text-amber-700',
  tarde: 'bg-orange-100 text-orange-700',
  noite: 'bg-indigo-100 text-indigo-700',
  integral: 'bg-green-100 text-green-700',
};

function shiftLabel(shift: string) {
  return SHIFT_LABELS[shift.toLowerCase()] ?? shift;
}

function shiftColor(shift: string) {
  return SHIFT_COLORS[shift.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}

function OccupancyBar({ classes, capacity }: { classes: RoomClass[]; capacity?: number | null }) {
  const total = classes.reduce((sum, c) => sum + c._count.students, 0);

  if (classes.length === 0) {
    return <span className="text-xs text-gray-400">Sem turmas</span>;
  }

  if (!capacity) {
    return (
      <span className="text-xs text-gray-600 flex items-center gap-1">
        <Users size={12} className="text-gray-400" />
        {total} aluno{total !== 1 ? 's' : ''}
      </span>
    );
  }

  const pct = Math.min(100, Math.round((total / capacity) * 100));
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-14 text-right">
        {total}/{capacity}
      </span>
    </div>
  );
}

export default function RoomsPage() {
  const qc = useQueryClient();
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('');

  function openEdit(r: Room) {
    setEditId(r.id);
    setEditName(r.name);
    setEditCapacity(r.capacity != null ? String(r.capacity) : '');
    setExpandedId(null);
  }
  function closeEdit() { setEditId(null); }

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', showInactive],
    queryFn: () => roomsApi.list({ includeInactive: showInactive }).then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const rows: Room[] = Array.isArray(data) ? data : (data?.data ?? []);
    if (!search) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const createMut = useMutation({
    mutationFn: () => roomsApi.create({
      name: newName.trim(),
      capacity: newCapacity ? parseInt(newCapacity, 10) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      setShowNew(false);
      setNewName('');
      setNewCapacity('');
    },
  });

  const updateMut = useMutation({
    mutationFn: () => roomsApi.update(editId!, {
      name: editName.trim(),
      capacity: editCapacity ? parseInt(editCapacity, 10) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); closeEdit(); },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => roomsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => roomsApi.reactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as salas e visualize a ocupação por turma</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowNew(true); setEditId(null); }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" /> Nova Sala
          </button>
        )}
      </div>

      {/* Formulário nova sala */}
      {showNew && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Nova Sala</h2>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="Ex: Sala 101"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Capacidade</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="Ex: 35"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!newName.trim() || createMut.isPending}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {createMut.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar
            </button>
          </div>
          {createMut.isError && (
            <p className="text-sm text-red-600">
              {(createMut.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar sala'}
            </p>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder="Buscar sala..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver desativadas
        </label>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <DoorOpen className="w-10 h-10 mb-3" />
            <p className="text-sm">{search ? 'Nenhuma sala encontrada' : 'Nenhuma sala cadastrada'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-6" />
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sala</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Turnos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ocupação</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((room) =>
                editId === room.id ? (
                  <tr key={room.id} className="bg-primary-50">
                    <td className="px-4 py-3" colSpan={2}>
                      <input
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome da sala"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-24 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        placeholder="Cap."
                      />
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" colSpan={isAdmin ? 2 : 1}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateMut.mutate()}
                          disabled={!editName.trim() || updateMut.isPending}
                          className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {updateMut.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          Salvar
                        </button>
                        <button onClick={closeEdit} className="px-3 py-1 text-gray-500 text-xs hover:text-gray-700">Cancelar</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr
                      key={room.id}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${!room.active ? 'opacity-50' : ''}`}
                      onClick={() => setExpandedId(expandedId === room.id ? null : room.id)}
                    >
                      {/* Expand chevron */}
                      <td className="px-4 py-3 text-gray-400">
                        {room.classes.length > 0
                          ? expandedId === room.id
                            ? <ChevronUp size={14} />
                            : <ChevronDown size={14} />
                          : null}
                      </td>

                      {/* Nome + capacidade */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{room.name}</p>
                        {room.capacity && (
                          <p className="text-xs text-gray-400 mt-0.5">Cap. {room.capacity}</p>
                        )}
                      </td>

                      {/* Turnos ocupados */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {room.classes.length === 0 ? (
                            <span className="text-xs text-gray-400">Livre</span>
                          ) : (
                            [...new Set(room.classes.map((c) => c.shift))].map((shift) => (
                              <span key={shift} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${shiftColor(shift)}`}>
                                {shiftLabel(shift)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Barra de ocupação */}
                      <td className="px-4 py-3">
                        <OccupancyBar classes={room.classes} capacity={room.capacity} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${room.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {room.active ? 'Ativa' : 'Desativada'}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            isActive={room.active}
                            onEdit={() => openEdit(room)}
                            onArchive={() => deactivateMut.mutate(room.id)}
                            onReactivate={() => reactivateMut.mutate(room.id)}
                            onDelete={() => deleteMut.mutate(room.id)}
                          />
                        </td>
                      )}
                    </tr>

                    {/* Detalhe expandido — turmas */}
                    {expandedId === room.id && room.classes.length > 0 && (
                      <tr key={`${room.id}-detail`} className="bg-gray-50">
                        <td colSpan={isAdmin ? 6 : 5} className="px-8 pb-4 pt-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Turmas nesta sala</p>
                          <div className="flex flex-col gap-1.5">
                            {room.classes.map((cls) => (
                              <div key={cls.id} className="flex items-center gap-3 text-sm">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${shiftColor(cls.shift)}`}>
                                  {shiftLabel(cls.shift)}
                                </span>
                                <span className="font-medium text-gray-800">{cls.name}</span>
                                {cls.grade && <span className="text-gray-500">{cls.grade}</span>}
                                <span className="text-gray-400 flex items-center gap-1">
                                  <Users size={12} />
                                  {cls._count.students} aluno{cls._count.students !== 1 ? 's' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
