'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Loader2, Search, Plus, X, DoorOpen } from 'lucide-react';
import ActionMenu from '@/components/ActionMenu';

type Room = {
  id: string;
  name: string;
  capacity?: number | null;
  active: boolean;
};

export default function RoomsPage() {
  const qc = useQueryClient();
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as salas da escola</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowNew(true); setEditId(null); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Nova Sala
          </button>
        )}
      </div>

      {/* New room form */}
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Sala 101"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Capacidade</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full"
            placeholder="Buscar sala..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver desativadas
        </label>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <DoorOpen className="w-10 h-10 mb-3" />
            <p className="text-sm">{search ? 'Nenhuma sala encontrada' : 'Nenhuma sala cadastrada'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Capacidade</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((room) =>
                editId === room.id ? (
                  <tr key={room.id} className="bg-indigo-50">
                    <td className="px-4 py-3">
                      <input
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateMut.mutate()}
                          disabled={!editName.trim() || updateMut.isPending}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {updateMut.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          Salvar
                        </button>
                        <button onClick={closeEdit} className="px-3 py-1 text-gray-500 text-xs hover:text-gray-700">Cancelar</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={room.id} className={!room.active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{room.name}</td>
                    <td className="px-4 py-3 text-gray-600">{room.capacity ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${room.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {room.active ? 'Ativa' : 'Desativada'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
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
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
