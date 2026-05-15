'use client';

import { useRef, useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';

interface DateInputProps {
  value?: string; // yyyy-mm-dd
  onChange?: (value: string) => void; // emits yyyy-mm-dd or ''
  className?: string;
  name?: string;
}

function isoToDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(display)) {
    const [d, m, y] = display.split('/');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DateInput({ value = '', onChange, className, name }: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value);
    setDisplay(masked);
    onChange?.(displayToIso(masked));
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value; // yyyy-mm-dd
    setDisplay(isoToDisplay(iso));
    onChange?.(iso);
  }

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={display}
        onChange={handleChange}
        placeholder="dd/mm/aaaa"
        className={className}
        maxLength={10}
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={() => pickerRef.current?.showPicker?.()}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        <CalendarDays size={15} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={displayToIso(display)}
        onChange={handlePickerChange}
        className="absolute inset-0 opacity-0 pointer-events-none w-full"
        tabIndex={-1}
      />
    </div>
  );
}
