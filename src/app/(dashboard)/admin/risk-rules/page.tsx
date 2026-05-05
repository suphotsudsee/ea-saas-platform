'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Activity, ShieldAlert, Zap } from 'lucide-react';
import api from '@/lib/api';

interface RiskDashboardResponse {
  globalKillSwitch: boolean;
  globalKillReason: string | null;
  summary: {
    totalActiveAccounts: number;
    criticalAccounts: number;
    warningAccounts: number;
    healthyAccounts: number;
  };
  recentRiskEvents: Array<{
    id: string;
    ruleType: string;
    thresholdValue: number;
    actualValue: number;
    actionTaken: string;
    createdAt: string;
    resolvedAt: string | null;
    license: {
      id: string;
      key: string;
      user: {
        id: string;
        name: string | null;
        email: string;
      };
    };
    tradingAccount: {
      id: string;
      accountNumber: string;
      brokerName: string;
      platform: string;
      status: string;
    };
  }>;
  killedLicenses: Array<{
    id: string;
    key: string;
    killSwitchReason: string | null;
    strategy: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    tradingAccounts: Array<{
      id: string;
      accountNumber: string;
      brokerName: string;
      platform: string;
    }>;
  }>;
  staleAccounts: Array<{
    id: string;
    accountNumber: string;
    brokerName: string;
    platform: string;
    status: string;
    lastHeartbeatAt?: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    license: {
      id: string;
      key: string;
      strategy: {
        name: string;
      };
    };
  }>;
}

type RiskRow = {
  id: string;
  account: string;
  customer: string;
  metricValue: string;
  limitValue: string;
  status: 'CRITICAL' | 'WARNING' | 'NORMAL';
  source: 'risk_event' | 'stale_account' | 'killed_license';
  actionLabel: string;
  riskEventId?: string;
  licenseId?: string;
};

function statusClass(status: string) {
  if (status === 'CRITICAL') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  if (status === 'WARNING') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function AdminRiskPage() {
  const [dashboard, setDashboard] = useState<RiskDashboardResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [globalKillPending, setGlobalKillPending] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const response = await api.get<RiskDashboardResponse>('/admin/risk-rules');
      setDashboard(response.data);
      setLoadFailed(false);
    } catch {
      setDashboard(null);
      setLoadFailed(true);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const rows = useMemo<RiskRow[]>(() => {
    if (!dashboard) return [];

    const riskEventRows: RiskRow[] = dashboard.recentRiskEvents.map((event) => {
      const gap = event.actualValue - event.thresholdValue;
      const status: RiskRow['status'] = gap >= 5 ? 'CRITICAL' : 'WARNING';

      return {
        id: event.id,
        account: event.tradingAccount.accountNumber,
        customer: event.license.user.name || event.license.user.email,
        metricValue: formatPct(event.actualValue),
        limitValue: formatPct(event.thresholdValue),
        status,
        source: 'risk_event',
        actionLabel: 'Resolve',
        riskEventId: event.id,
        licenseId: event.license.id,
      };
    });

    const staleRows: RiskRow[] = dashboard.staleAccounts.map((account) => ({
      id: `stale-${account.id}`,
      account: account.accountNumber,
      customer: account.user.name || account.user.email,
      metricValue: 'STALE',
      limitValue: 'Heartbeat',
      status: 'WARNING',
      source: 'stale_account',
      actionLabel: 'Review',
      licenseId: account.license.id,
    }));

    const killedRows: RiskRow[] = dashboard.killedLicenses.flatMap((license) =>
      license.tradingAccounts.map((account) => ({
        id: `killed-${license.id}-${account.id}`,
        account: account.accountNumber,
        customer: license.user.name || license.user.email,
        metricValue: 'KILLED',
        limitValue: license.killSwitchReason || 'Kill switch active',
        status: 'CRITICAL' as const,
        source: 'killed_license' as const,
        actionLabel: 'Investigate',
        licenseId: license.id,
      }))
    );

    return [...riskEventRows, ...staleRows, ...killedRows];
  }, [dashboard]);
  const criticalCount = dashboard?.summary.criticalAccounts ?? 0;
  const warningCount = dashboard?.summary.warningAccounts ?? 0;
  const healthyCount = dashboard?.summary.healthyAccounts ?? 0;

  const handleResolveEvent = async (riskEventId: string) => {
    setPendingActionId(riskEventId);
    try {
      await api.patch('/admin/risk-rules', {
        action: 'resolve_event',
        riskEventId,
      });
      await loadDashboard();
    } finally {
      setPendingActionId(null);
    }
  };

  const handleGlobalKillSwitch = async () => {
    setGlobalKillPending(true);
    try {
      await api.patch('/admin/risk-rules', {
        action: 'global_kill_switch',
        activate: !dashboard?.globalKillSwitch,
        reason: dashboard?.globalKillSwitch ? 'Released from admin risk dashboard' : 'Triggered from admin risk dashboard',
      });
      await loadDashboard();
    } finally {
      setGlobalKillPending(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Risk management</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Escalate account risk before it becomes an operational incident.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            This screen now reflects actual unresolved risk events, stale heartbeat accounts, and active kill switch cases.
          </p>
        </div>
        <Button
          variant="outline"
          className={`rounded-full px-5 ${
            dashboard?.globalKillSwitch
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
              : 'border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10'
          }`}
          onClick={handleGlobalKillSwitch}
          disabled={globalKillPending}
        >
          <ShieldAlert className="mr-2 h-4 w-4" />
          {globalKillPending
            ? dashboard?.globalKillSwitch
              ? 'Turning off...'
              : 'Applying kill switch...'
            : dashboard?.globalKillSwitch
              ? 'Turn off global kill switch'
              : 'Global kill switch'}
        </Button>
      </section>

      {loadFailed ? (
        <Card className="rounded-[28px] border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-6 text-sm text-rose-200">Failed to load risk dashboard data.</CardContent>
        </Card>
      ) : null}

      {dashboard?.globalKillSwitch ? (
        <Card className="rounded-[28px] border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-6 text-sm text-rose-200">
            Global kill switch is active{dashboard.globalKillReason ? `: ${dashboard.globalKillReason}` : '.'}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Critical accounts</div>
              <div className="mt-2 text-3xl font-semibold text-white">{criticalCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Warning accounts</div>
              <div className="mt-2 text-3xl font-semibold text-white">{warningCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Healthy accounts</div>
              <div className="mt-2 text-3xl font-semibold text-white">{healthyCount}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        {rows.length === 0 ? (
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardContent className="p-6 text-sm text-slate-400">No active risk issues found.</CardContent>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id} className="rounded-[30px] border-white/8 bg-white/[0.03]">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_0.9fr_0.7fr_0.9fr_auto] lg:items-center">
                <div>
                  <div className="text-sm font-semibold text-white">{row.account}</div>
                  <div className="mt-1 text-xs text-slate-500">Account number</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{row.customer}</div>
                  <div className="mt-1 text-xs text-slate-500">Customer</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current</div>
                  <div className="mt-2 text-lg font-semibold text-white">{row.metricValue}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Limit / reason</div>
                  <div className="mt-2 text-lg font-semibold text-white">{row.limitValue}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusClass(row.status)}>{row.status}</Badge>
                  {row.riskEventId ? (
                    <Button
                      variant="outline"
                      className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10"
                      onClick={() => handleResolveEvent(row.riskEventId!)}
                      disabled={pendingActionId === row.riskEventId}
                    >
                      {pendingActionId === row.riskEventId ? 'Resolving...' : row.actionLabel}
                    </Button>
                  ) : (
                    <Button variant="outline" className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]" disabled>
                      {row.actionLabel}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
