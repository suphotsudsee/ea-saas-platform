'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PnLChart } from '@/components/dashboard/pnl-chart';
import { RecentTrades } from '@/components/dashboard/recent-trades';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowUpRight, Shield, TrendingUp, WalletCards, Zap } from 'lucide-react';
import api from '@/lib/api';

interface TradeStatsResponse {
  stats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    totalCommission: number;
    totalSwap: number;
    netPnl: number;
    totalVolume: number;
  };
}

interface SubscriptionResponse {
  subscription: {
    currentPeriodEnd: string;
    package: {
      name: string;
      maxAccounts: number;
    };
  };
}

interface AccountsResponse {
  accounts: Array<{
    id: string;
    status: string;
    lastHeartbeatAt: string | null;
  }>;
}

interface LicensesResponse {
  licenses: Array<{
    id: string;
    status: string;
    killSwitch: boolean;
  }>;
}

interface TradeListResponse {
  trades: Array<{
    id: string;
    eventType: 'OPEN' | 'CLOSE' | 'MODIFY' | 'PARTIAL_CLOSE';
    symbol: string;
    profit: number | null;
    createdAt: string;
    closeTime?: string | null;
    tradingAccount?: {
      accountNumber: string;
    };
  }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<TradeStatsResponse['stats'] | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse['subscription'] | null>(null);
  const [accounts, setAccounts] = useState<AccountsResponse['accounts']>([]);
  const [licenses, setLicenses] = useState<LicensesResponse['licenses']>([]);
  const [trades, setTrades] = useState<TradeListResponse['trades']>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [statsRes, accountsRes, licensesRes, tradesRes, subscriptionRes] = await Promise.allSettled([
          api.get<TradeStatsResponse>('/trade-events/stats'),
          api.get<AccountsResponse>('/trading-accounts/list'),
          api.get<LicensesResponse>('/licenses/list'),
          api.get<TradeListResponse>('/trade-events/list?pageSize=7'),
          api.get<SubscriptionResponse>('/subscriptions/current'),
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats);
        if (accountsRes.status === 'fulfilled') setAccounts(accountsRes.value.data.accounts);
        if (licensesRes.status === 'fulfilled') setLicenses(licensesRes.value.data.licenses);
        if (tradesRes.status === 'fulfilled') setTrades(tradesRes.value.data.trades);
        if (subscriptionRes.status === 'fulfilled') setSubscription(subscriptionRes.value.data.subscription);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const activeAccounts = accounts.filter((account) => account.status === 'ACTIVE');
  const activeLicenses = licenses.filter((license) => license.status === 'ACTIVE');
  const healthPct = accounts.length > 0 ? (activeAccounts.length / accounts.length) * 100 : 0;
  const activeHeartbeats = activeAccounts.filter((account) => account.lastHeartbeatAt).length;

  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        equity: 0,
      };
    });

    for (const trade of trades) {
      const pointKey = new Date(trade.closeTime || trade.createdAt).toISOString().slice(0, 10);
      const bucket = buckets.find((entry) => entry.key === pointKey);
      if (bucket) {
        bucket.equity += trade.profit || 0;
      }
    }

    let running = 0;
    return buckets.map((bucket) => {
      running += bucket.equity;
      return { name: bucket.name, equity: running };
    });
  }, [trades]);

  const recentActivity = useMemo(
    () =>
      trades.slice(0, 5).map((trade) => {
        const profit = trade.profit || 0;
        return {
          id: trade.id,
          event: trade.eventType === 'CLOSE' ? 'Trade Closed' : trade.eventType.replace('_', ' '),
          symbol: trade.symbol || trade.tradingAccount?.accountNumber || '-',
          signal:
            trade.eventType === 'CLOSE'
              ? `${profit >= 0 ? '+' : ''}${formatCurrency(profit)}`
              : trade.eventType,
          time: formatRelativeTime(trade.closeTime || trade.createdAt),
          type: (trade.eventType === 'CLOSE'
            ? profit >= 0
              ? 'profit'
              : 'warning'
            : 'info') as 'profit' | 'warning' | 'info',
        };
      }),
    [trades]
  );

  const renewalText = subscription
    ? `Renewal due ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} with ${subscription.package.maxAccounts} linked account slots.`
    : 'No active subscription found.';

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-amber-900/30 bg-[linear-gradient(135deg,#0f172a_0%,#17120d_100%)] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10">
              AI Gold Trading Bot
            </Badge>
            <Badge variant="outline" className="border-amber-900/30 bg-white/[0.04] text-slate-300">
              {activeLicenses.length} active licenses
            </Badge>
          </div>

          <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            คุม AI เทรดทองคำและ License Key จาก dashboard เดียว.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            ติดตาม P&L, heartbeat, license และ risk guardrails สำหรับ XAUUSD บน MT5 โดยไม่ต้องเปิด terminal แต่ละเครื่องเอง.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <div className="rounded-2xl border border-amber-900/30 bg-white/[0.04] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Today&apos;s net result</div>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                {formatCurrency(stats?.netPnl || 0)}
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                  <ArrowUpRight className="h-3 w-3" />
                  {stats ? `${stats.winRate.toFixed(1)}% win rate` : 'Live'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-900/30 bg-white/[0.04] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Account health</div>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                {healthPct.toFixed(1)}%
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                  Rules active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[28px] border border-amber-900/30 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Heartbeat</div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Activity className="h-4 w-4 text-amber-400" />
              {activeHeartbeats > 0 ? 'Streaming normally' : 'Awaiting heartbeat'}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {activeHeartbeats > 0
                ? `${activeHeartbeats} active accounts have reported heartbeat.`
                : 'No active account heartbeat reported yet.'}
            </p>
          </div>

          <div className="rounded-[28px] border border-amber-900/30 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Subscriptions</div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <WalletCards className="h-4 w-4 text-amber-400" />
              {subscription?.package.name || 'No active plan'}
            </div>
            <p className="mt-2 text-sm text-slate-400">{renewalText}</p>
          </div>

          <div className="rounded-[28px] border border-amber-900/30 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Protection</div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Shield className="h-4 w-4 text-amber-400" />
              {licenses.some((license) => license.killSwitch) ? 'Kill switch engaged' : 'Guardrails armed'}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {activeLicenses.length} active licenses monitored with protection controls.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total P&L"
          value={formatCurrency(stats?.netPnl || 0)}
          trend={`${stats?.totalTrades || 0} trades`}
          trendUp={(stats?.netPnl || 0) >= 0}
          icon={<TrendingUp className="h-5 w-5 text-amber-300" />}
          tone="amber"
        />
        <StatsCard
          title="Win Rate"
          value={`${(stats?.winRate || 0).toFixed(1)}%`}
          trend={`${stats?.winningTrades || 0} winners`}
          trendUp={(stats?.winRate || 0) >= 50}
          icon={<Zap className="h-5 w-5 text-[#f4c77d]" />}
          tone="amber"
        />
        <StatsCard
          title="Active EAs"
          value={String(activeAccounts.length)}
          trend={`${licenses.length} linked licenses`}
          trendUp={true}
          icon={<Activity className="h-5 w-5 text-amber-300" />}
          tone="amber"
        />
        <StatsCard
          title="Max Drawdown"
          value="N/A"
          trend="No metric feed yet"
          trendUp={false}
          icon={<Shield className="h-5 w-5 text-rose-300" />}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="rounded-[32px] border-amber-900/30 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg text-white">Equity Curve</CardTitle>
                <p className="mt-1 text-sm text-slate-400">7-day view across active strategy accounts.</p>
              </div>
              <Badge variant="outline" className="border-amber-900/30 bg-white/[0.04] text-slate-300">
                {isLoading ? 'Loading...' : 'Updated live'}
              </Badge>
            </CardHeader>
            <CardContent>
              <PnLChart data={chartData} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full rounded-[32px] border-amber-900/30 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
              <p className="text-sm text-slate-400">Latest real trade events from your connected accounts.</p>
            </CardHeader>
            <CardContent>
              <RecentTrades items={recentActivity} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
