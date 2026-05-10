'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getUser, clearTokens } from '@/lib/auth';
import {
  LayoutDashboard, MessageSquare, Calendar, FileText,
  Users, GraduationCap, LogOut, School, Menu, X, BookUser, CalendarCheck, UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'ADMIN' | 'SECRETARY' | 'COORDINATOR' | 'TEACHER';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Diretor(a)',
  SECRETARY: 'Secretaria',
  COORDINATOR: 'Coordenador(a)',
  TEACHER: 'Professor(a)',
};

const navItems = [
  { href: '/dashboard',                  icon: LayoutDashboard, label: 'Painel',          roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/communications',   icon: MessageSquare,   label: 'Comunicados',     roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/agenda',           icon: Calendar,        label: 'Agenda',           roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/appointments',     icon: CalendarCheck,   label: 'Agendamentos',     roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/forms',            icon: FileText,        label: 'Formulários',      roles: ['ADMIN', 'SECRETARY', 'COORDINATOR'] },
  { href: '/dashboard/users',            icon: Users,           label: 'Equipe',            roles: ['ADMIN'] },
  { href: '/dashboard/classes',          icon: GraduationCap,   label: 'Turmas',            roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/students',         icon: BookUser,        label: 'Alunos',            roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/guardians',        icon: Users,           label: 'Responsáveis',      roles: ['ADMIN', 'SECRETARY', 'COORDINATOR', 'TEACHER'] },
  { href: '/dashboard/settings',         icon: School,          label: 'Escola',             roles: ['ADMIN'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setUser(getUser());
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  const role = (user?.role ?? 'TEACHER') as Role;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  function logout() {
    clearTokens();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform',
        'lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-gray-900">Presente</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-medium text-sm">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? 'Usuário'}</p>
              <p className="text-xs text-gray-500 truncate">{ROLE_LABELS[role] ?? role}</p>
            </div>
          </div>
          <Link
            href="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors mb-1',
              pathname === '/dashboard/profile'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <UserCircle size={16} />
            Meu Perfil
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          {role === 'TEACHER' && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Visualizando apenas suas turmas
            </span>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
