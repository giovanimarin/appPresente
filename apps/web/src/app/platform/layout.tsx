'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Building2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === '/platform/login') {
      setChecked(true);
      return;
    }
    const token = localStorage.getItem('platformToken');
    if (!token) {
      router.replace('/platform/login');
      return;
    }
    const raw = localStorage.getItem('platformUser');
    if (raw) setUser(JSON.parse(raw));
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;
  if (pathname === '/platform/login') return <>{children}</>;

  const nav = [
    { href: '/platform', icon: LayoutDashboard, label: 'Visão Geral' },
    { href: '/platform/schools', icon: Building2, label: 'Escolas' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-gray-800">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center mr-2.5">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="text-white font-semibold text-sm">Platform</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-400 truncate">{user?.name}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('platformToken');
              localStorage.removeItem('platformUser');
              router.push('/platform/login');
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
