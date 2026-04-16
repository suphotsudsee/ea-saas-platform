'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Key, 
  CreditCard, 
  Activity, 
  Settings, 
  UserCircle, 
  LogOut, 
  ShieldAlert, 
  Users, 
  TrendingUp, 
  Layers 
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Licenses', href: '/dashboard/licenses', icon: Key },
    { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: Activity },
    { name: 'Trade History', href: '/dashboard/trade-history', icon: TrendingUp },
    { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const adminItems = [
    { name: 'Admin Home', href: '/dashboard/admin', icon: ShieldAlert },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
    { name: 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: CreditCard },
    { name: 'Licenses', href: '/dashboard/admin/licenses', icon: Key },
    { name: 'Strategies', href: '/dashboard/admin/strategies', icon: Layers },
    { name: 'Risk Rules', href: '/dashboard/admin/risk-rules', icon: ShieldAlert },
  ];

  const activeMenu = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' 
    ? [...menuItems, ...adminItems] 
    : menuItems;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
            EA
          </div>
          <span className="font-bold text-lg tracking-tight">EA SaaS</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
              Main Menu
            </p>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
                Administration
              </p>
              <ul className="space-y-1">
                {adminItems.map((item) => (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors group">
            <UserCircle className="w-4 h-4" />
            <span className="flex-1 truncate">{user?.name || 'User'}</span>
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400" onClick={logout} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8 backdrop-blur-sm">
          <h2 className="text-sm font-medium text-slate-400">Dashboard / <span className="text-white">Overview</span></h2>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
              Server: <span className="text-green-400">Operational</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
