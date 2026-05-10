'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { id: string; name: string; grade?: string };

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export default function ClassCombobox({ options, value, onChange, placeholder = 'Selecionar turma', emptyLabel = 'Sem turma', className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = options.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.grade?.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setSearch('');
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(''); }}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white text-left flex items-center gap-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
      >
        <span className={cn('flex-1 truncate', !selected && 'text-gray-400')}>
          {selected ? `${selected.name}${selected.grade ? ` · ${selected.grade}` : ''}` : placeholder}
        </span>
        {value ? (
          <X size={14} className="text-gray-400 hover:text-gray-600 flex-shrink-0" onClick={clear} />
        ) : (
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar turma..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => select('')}
              className={cn('w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-400 italic', !value && 'bg-primary-50 text-primary-700 font-medium not-italic')}>
              {emptyLabel}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">Nenhuma turma encontrada</p>
            ) : filtered.map((o) => (
              <button key={o.id} type="button" onClick={() => select(o.id)}
                className={cn('w-full px-3 py-2 text-left text-sm hover:bg-gray-50', value === o.id && 'bg-primary-50 text-primary-700 font-medium')}>
                {o.name}{o.grade ? <span className="text-gray-400 font-normal"> · {o.grade}</span> : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
