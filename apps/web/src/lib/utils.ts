import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Aplica máscara progressiva durante digitação: (XX) XXXXX-XXXX
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function commTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NOTICE: 'Aviso',
    URGENT: 'Urgente',
    INFORMATIVE: 'Informativo',
    DOCUMENT: 'Documento',
    PHOTO: 'Foto',
    EXAM: 'Prova',
    MEETING: 'Reunião',
  };
  return labels[type] ?? type;
}

export function commTypeColor(type: string): string {
  const colors: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-800',
    NOTICE: 'bg-blue-100 text-blue-800',
    INFORMATIVE: 'bg-gray-100 text-gray-800',
    DOCUMENT: 'bg-purple-100 text-purple-800',
    PHOTO: 'bg-green-100 text-green-800',
    EXAM: 'bg-orange-100 text-orange-800',
    MEETING: 'bg-indigo-100 text-indigo-800',
  };
  return colors[type] ?? 'bg-gray-100 text-gray-800';
}
