import { z } from 'zod';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: '1 letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 número', test: (v: string) => /[0-9]/.test(v) },
  { label: '1 caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordFieldSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, '1 letra maiúscula')
  .regex(/[0-9]/, '1 número')
  .regex(/[^A-Za-z0-9]/, '1 caractere especial');

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-green-600' : 'text-gray-400')}>
            {ok ? <Check size={12} /> : <X size={12} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
