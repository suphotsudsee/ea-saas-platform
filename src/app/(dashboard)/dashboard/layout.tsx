'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Activity,
  BarChart3,
  CreditCard,
  Key,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  UserCircle2,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const menuItems: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Licenses', href: '/dashboard/licenses', icon: Key },
  { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: WalletCards },
  { name: 'Trade History', href: '/dashboard/trade-history', icon: BarChart3 },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminItems: NavItem[] = [
  { name: 'Admin Home', href: '/dashboard/admin', icon: ShieldAlert },
  { name: 'Users', href: '/dashboard/admin/users', icon: Users },
  { name: 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: CreditCard },
  { name: 'Licenses', href: '/dashboard/admin/licenses', icon: Key },
  { name: 'Strategies', href: '/dashboard/admin/strategies', icon: Layers },
  { name: 'Risk Rules', href: '/dashboard/admin/risk-rules', icon: ShieldAlert },
];

function isActiveRoute(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  return pathname.startsWith(`${href}/`);
}

function SidebarSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <ul className="mt-4 space-y-1.5">
        {items.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                  active
                    ? 'bg-[#112129] text-white shadow-[inset_0_0_0_1px_rgba(140,201,194,0.18)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    active ? 'bg-[#8cc9c2] text-[#081118]' : 'bg-white/[0.04] text-slate-400 group-hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const allItems = [...menuItems, ...adminItems];
    const current = allItems.find((item) => isActiveRoute(pathname, item.href));
    return current?.name ?? 'Dashboard';
  }, [pathname]);

  const isAdmin =
    user?.actorType === 'admin' ||
    ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'RISK_ADMIN', 'SUPPORT'].includes(user?.role || '');

  return (
    <div className="min-h-screen bg-[#081118] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(140,201,194,0.11),rgba(8,17,24,0)_68%)]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(227,168,79,0.08),rgba(8,17,24,0)_70%)]" />
      </div>

      <div className="relative flex min-h-screen">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-white/8 bg-[#0b151d]/95 px-5 py-5 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between pb-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8cc9c2] text-sm font-bold text-[#081118]">
                EA
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Console</div>
                <div className="text-base font-semibold text-white">EA SaaS</div>
              </div>
            </Link>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</div>
            <div className="mt-3 text-lg font-semibold text-white">{user?.name || 'Operator'}</div>
            <div className="mt-1 text-sm text-slate-400">{user?.email || 'No email loaded'}</div>
            <div className="mt-4 inline-flex rounded-full bg-[#112129] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8cc9c2]">
              {user?.role || 'Trader'}
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-8 overflow-y-auto pr-1">
            <SidebarSection title="Main" items={menuItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            {isAdmin && (
              <SidebarSection
                title="Administration"
                items={adminItems}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            )}
          </nav>

          <div className="mt-6 rounded-[28px] border border-white/8 bg-[#16130d] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2a2212] text-[#f4c77d]">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Risk posture</div>
                <div className="text-xs text-slate-400">Protective rules active</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[#081118]/85 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard</div>
                  <h1 className="text-xl font-semibold text-white sm:text-2xl">{pageTitle}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-400 sm:block">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#8cc9c2]" />
                  System healthy
                </div>
                <div className="flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2">
                  <UserCircle2 className="h-4 w-4 text-slate-400" />
                  <span className="hidden text-sm text-slate-300 sm:block">{user?.name || 'User'}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
