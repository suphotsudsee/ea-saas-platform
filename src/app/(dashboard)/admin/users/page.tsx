'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Filter, RefreshCw, Search, Shield, User } from 'lucide-react';

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  emailVerified: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: string;
    package: {
      name: string;
    };
  }>;
  tradingAccounts: Array<{
    updatedAt: string;
  }>;
  _count: {
    subscriptions: number;
    licenses: number;
    tradingAccounts: number;
  };
};

function statusClass(status: string) {
  if (status === 'ACTIVE') {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  }

  if (status === 'SUSPENDED') {
    return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  }

  return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatRelative(value?: string) {
  if (!value) return 'No activity';

  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMs = Math.max(0, now - then);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Less than 1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;

  return formatDate(value);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'BANNED'>('ALL');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to load customer records');

      const data = await response.json();
      const normalized = Array.isArray(data.users)
        ? data.users.map((u: any) => ({
            ...u,
            _count: u._count ?? { subscriptions: 0, licenses: 0, tradingAccounts: 0 },
            subscriptions: u.subscriptions ?? [],
            tradingAccounts: u.tradingAccounts ?? [],
          }))
        : [];
      setUsers(normalized);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadUsers, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setPendingUserId(userId);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
        credentials: 'include',
      });
      await loadUsers();
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will revoke all licenses and cancel subscriptions.')) return;
    setPendingUserId(userId);
    try {
      await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await loadUsers();
    } finally {
      setPendingUserId(null);
    }
  };

  const summary = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc.total += 1;
        if (user.status === 'ACTIVE') acc.active += 1;
        if ((user._count?.licenses ?? 0) > 0) acc.withLicenses += 1;
        if ((user._count?.tradingAccounts ?? 0) > 0) acc.withAccounts += 1;
        return acc;
      },
      { total: 0, active: 0, withLicenses: 0, withAccounts: 0 }
    );
  }, [users]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8">
        <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Customer management</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Review customer state, plan tier, and activity signals from one list.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          This view now reads live customer records from the platform database instead of mock rows, so support and ops can search real users before moving into license or subscription work.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Customers</div>
            <div className="mt-3 text-3xl font-semibold text-white">{summary.total}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Active</div>
            <div className="mt-3 text-3xl font-semibold text-white">{summary.active}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">With licenses</div>
            <div className="mt-3 text-3xl font-semibold text-white">{summary.withLicenses}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Connected accounts</div>
            <div className="mt-3 text-3xl font-semibold text-white">{summary.withAccounts}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-white">All customers</CardTitle>
            <p className="mt-1 text-sm text-slate-400">Live user list with plan, license, and account coverage.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="rounded-2xl border-white/10 bg-[#0c1720] pl-9 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusFilter('ALL')}
                className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              >
                <Filter className="mr-2 h-4 w-4" />
                All
              </Button>
              <Button
                variant="outline"
                onClick={() => setStatusFilter('ACTIVE')}
                className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              >
                Active
              </Button>
              <Button
                variant="outline"
                onClick={() => setStatusFilter('SUSPENDED')}
                className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              >
                Suspended
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-8 text-sm text-slate-400">
              <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
              Loading customer records...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {!loading && !error && users.length === 0 ? (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-8 text-sm text-slate-400">
              No customer records matched this filter.
            </div>
          ) : null}

          {!loading && !error
            ? users.map((user) => {
                const latestSubscription = user.subscriptions?.[0];
                const tier = latestSubscription?.package?.name ?? 'No plan';
                const lastActive = user.tradingAccounts?.[0]?.updatedAt;

                return (
                  <div
                    key={user.id}
                    className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.9fr_auto] lg:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-300">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{user.name || 'Unnamed user'}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Plan</div>
                      <div className="mt-2 text-sm font-medium text-white">{tier}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
                      <Badge className={`mt-2 ${statusClass(user.status)}`}>{user.status}</Badge>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Coverage</div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {user._count?.licenses ?? 0} licenses / {user._count?.tradingAccounts ?? 0} accounts
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Last active</div>
                      <div className="mt-2 text-sm font-medium text-white">{formatRelative(lastActive)}</div>
                    </div>
                    <div className="flex gap-2 justify-end items-center">
                      {user.status === 'ACTIVE' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs"
                          onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                          disabled={pendingUserId === user.id}
                        >
                          {pendingUserId === user.id ? '...' : 'Suspend'}
                        </Button>
                      ) : null}
                      {user.status === 'ACTIVE' || user.status === 'SUSPENDED' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs"
                          onClick={() => handleStatusChange(user.id, 'BANNED')}
                          disabled={pendingUserId === user.id}
                        >
                          {pendingUserId === user.id ? '...' : 'Ban'}
                        </Button>
                      ) : null}
                      {user.status === 'SUSPENDED' || user.status === 'BANNED' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs"
                          onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                          disabled={pendingUserId === user.id}
                        >
                          {pendingUserId === user.id ? '...' : 'Activate'}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full border border-rose-500/20 bg-transparent text-rose-400 hover:bg-rose-500/10 text-xs"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={pendingUserId === user.id}
                      >
                        Delete
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] text-xs">
                        <Link href="/dashboard/admin/licenses">Licenses</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] text-xs">
                        <Link href="/dashboard/admin/subscriptions">
                          <Shield className="mr-1 h-3 w-3" />
                          Billing
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
