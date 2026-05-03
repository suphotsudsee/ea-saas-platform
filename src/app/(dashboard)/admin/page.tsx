'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CreditCard, KeyRound, Layers3, ShieldAlert, Users } from 'lucide-react';
import api from '@/lib/api';

interface AdminDashboardResponse {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalLicenses: number;
    activeLicenses: number;
    totalTradingAccounts: number;
    activeTradingAccounts: number;
    totalTrades: number;
    totalRevenueCents: number;
    killedLicenses: number;
    unresolvedRiskEvents: number;
    unresolvedRiskAccounts: number;
    globalKillSwitch: boolean;
  };
  growth: {
    recentSignups: number;
    mrrCents: number;
    arrCents: number;
  };
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function AdminKpiCard({
  title,
  value,
  trend,
  trendTone = 'emerald',
  icon,
}: {
  title: string;
  value: string;
  trend: string;
  trendTone?: 'emerald' | 'amber' | 'rose';
  icon: React.ReactNode;
}) {
  const trendClass =
    trendTone === 'rose'
      ? 'bg-rose-500/10 text-rose-300'
      : trendTone === 'amber'
        ? 'bg-amber-500/10 text-amber-300'
        : 'bg-emerald-500/10 text-emerald-300';

  return (
    <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
            <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${trendClass}`}>
              {trend}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthBar({
  label,
  value,
  color,
  status,
}: {
  label: string;
  value: number;
  color: string;
  status: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-white">{status}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get<AdminDashboardResponse>('/admin/dashboard')
      .then((response) => {
        if (!active) return;
        setDashboard(response.data);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setDashboard(null);
        setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = dashboard?.overview;
  const growth = dashboard?.growth;

  const health = useMemo(() => {
    const activeEAs = stats?.activeTradingAccounts ?? 0;
    const totalEAs = stats?.totalTradingAccounts ?? 0;
    const eaHealth = totalEAs > 0 ? Math.round((activeEAs / totalEAs) * 100) : 0;
    const impactedAccounts = stats?.unresolvedRiskAccounts ?? 0;
    const riskLoad = totalEAs > 0 ? Math.min(100, Math.round((impactedAccounts / totalEAs) * 100)) : 0;
    const licenseRisk = Math.min(100, (stats?.killedLicenses ?? 0) * 10);

    return {
      eaHealth,
      riskLoad,
      licenseRisk,
    };
  }, [stats]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[32px] border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)]">
          <CardContent className="p-6 sm:p-8">
            <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Admin command center</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Platform-wide visibility for licensing, revenue, and risk operations.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              This view is meant for fast executive scanning: monetization health, customer footprint, and the few risk signals that need immediate decisions.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button
              variant="outline"
              className="justify-start rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              onClick={() => router.push('/dashboard/admin/users')}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage users
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              onClick={() => router.push('/dashboard/admin/licenses')}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Audit license pool
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              onClick={() => router.push('/dashboard/admin/strategies')}
            >
              <Layers3 className="mr-2 h-4 w-4" />
              Review strategy setup
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
              onClick={() => router.push('/dashboard/admin/payments')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Track payments
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10"
              onClick={() => router.push('/dashboard/admin/risk-rules')}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Global kill switch
            </Button>
          </CardContent>
        </Card>
      </section>

      {loadFailed ? (
        <Card className="rounded-[28px] border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-6 text-sm text-rose-200">Failed to load admin dashboard data.</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Total MRR"
          value={formatCurrency(growth?.mrrCents ?? 0)}
          trend={`${growth?.recentSignups ?? 0} new signups / 30d`}
          icon={<CreditCard className="h-5 w-5 text-[#8cc9c2]" />}
        />
        <AdminKpiCard
          title="Active licenses"
          value={(stats?.activeLicenses ?? 0).toLocaleString('en-US')}
          trend={`${stats?.totalLicenses ?? 0} total issued`}
          icon={<KeyRound className="h-5 w-5 text-[#f4c77d]" />}
        />
        <AdminKpiCard
          title="Active EAs"
          value={(stats?.activeTradingAccounts ?? 0).toLocaleString('en-US')}
          trend={`${stats?.totalTradingAccounts ?? 0} connected accounts`}
          icon={<Layers3 className="h-5 w-5 text-sky-300" />}
        />
        <AdminKpiCard
          title="Risk alerts"
          value={(stats?.unresolvedRiskAccounts ?? 0).toLocaleString('en-US')}
          trend={
            stats?.globalKillSwitch
              ? 'Global kill switch active'
              : `${stats?.unresolvedRiskEvents ?? 0} open events`
          }
          trendTone={stats?.globalKillSwitch ? 'rose' : 'amber'}
          icon={<AlertTriangle className="h-5 w-5 text-rose-300" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">System health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <HealthBar label="EA connectivity" value={health.eaHealth} color="bg-emerald-400" status={`${stats?.activeTradingAccounts ?? 0}/${stats?.totalTradingAccounts ?? 0} active`} />
            <HealthBar label="Active user footprint" value={stats?.totalUsers ? Math.round(((stats?.activeUsers ?? 0) / stats.totalUsers) * 100) : 0} color="bg-sky-400" status={`${stats?.activeUsers ?? 0}/${stats?.totalUsers ?? 0} active`} />
            <HealthBar label="Killed license load" value={health.licenseRisk} color="bg-amber-400" status={`${stats?.killedLicenses ?? 0} licenses`} />
            <HealthBar label="Risk queue" value={health.riskLoad} color="bg-rose-400" status={`${stats?.unresolvedRiskAccounts ?? 0} accounts impacted`} />
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Operational notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-sm font-semibold text-white">Revenue snapshot</div>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Current MRR is {formatCurrency(growth?.mrrCents ?? 0)} and lifetime completed revenue is {formatCurrency(stats?.totalRevenueCents ?? 0)}.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-sm font-semibold text-white">License pressure</div>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                {stats?.activeLicenses ?? 0} active licenses, {stats?.killedLicenses ?? 0} kill-switched, and {stats?.unresolvedRiskAccounts ?? 0} accounts currently affected across {stats?.unresolvedRiskEvents ?? 0} unresolved risk events.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
