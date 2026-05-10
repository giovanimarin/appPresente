'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Calendar, FileText, User, CalendarCheck } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/guardian/feed', icon: Bell, label: 'Avisos' },
  { href: '/guardian/agenda', icon: Calendar, label: 'Agenda' },
  { href: '/guardian/appointments', icon: CalendarCheck, label: 'Reuniões' },
  { href: '/guardian/forms', icon: FileText, label: 'Pedidos' },
  { href: '/guardian/perfil', icon: User, label: 'Perfil' },
];

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isLoginPage = pathname === '/guardian';

  useEffect(() => {
    if (!isLoginPage && !isAuthenticated()) {
      router.replace('/guardian');
    } else {
      setChecked(true);
    }
  }, [isLoginPage, router]);

  if (!checked) return null;

  const showNav = !isLoginPage;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 pb-16">
        {children}
      </div>

      {showNav && (
        <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
          <div className="max-w-lg mx-auto flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                    active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
