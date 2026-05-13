'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, PowerOff, Power, Trash2 } from 'lucide-react';

interface ActionMenuProps {
  isActive: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  archivePending?: boolean;
  deletePending?: boolean;
}

export default function ActionMenu({
  isActive, onEdit, onArchive, onReactivate, onDelete,
  archivePending, deletePending,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function close() { setOpen(false); setConfirmDelete(false); }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1">
            <button
              onClick={() => { onEdit(); close(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={14} /> Editar
            </button>

            {isActive ? (
              <button
                onClick={() => { onArchive(); close(); }}
                disabled={archivePending}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                <PowerOff size={14} /> Desativar
              </button>
            ) : (
              <button
                onClick={() => { onReactivate(); close(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50"
              >
                <Power size={14} /> Ativar
              </button>
            )}

            <div className="border-t border-gray-100 mt-1 pt-1">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Excluir permanente
                </button>
              ) : (
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-600 mb-2">Tem certeza? Irreversível.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDelete(); close(); }}
                      disabled={deletePending}
                      className="flex-1 py-1 bg-red-600 text-white rounded text-xs font-medium disabled:opacity-50"
                    >
                      {deletePending ? '...' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1 border border-gray-200 text-gray-600 rounded text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
