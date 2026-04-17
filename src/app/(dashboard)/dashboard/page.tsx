'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PnLChart } from '@/components/dashboard/pnl-chart';
import { RecentTrades } from '@/components/dashboard/recent-trades';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowUpRight, Shield, TrendingUp, WalletCards, Zap } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">
              Live operations
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
              4 strategies connected
            </Badge>
          </div>

          <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your trading operation is stable, connected, and inside risk parameters.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Use this console to watch account behavior, react to risk events, and keep every strategy deployment aligned
            without touching each terminal manually.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Today&apos;s net result</div>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                $12,450.20
                <span className="inline-flex items-center gap-1 rounded-full bg-[#112129] px-2.5 py-1 text-xs font-semibold text-[#8cc9c2]">
                  <ArrowUpRight className="h-3 w-3" />
                  +12.5%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Account health</div>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                98.4%
                <span className="rounded-full bg-[#2a2212] px-2.5 py-1 text-xs font-semibold text-[#f4c77d]">
                  Rules active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Heartbeat</div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Activity className="h-4 w-4 text-[#8cc9c2]" />
              Streaming normally
            </div>
            <p className="mt-2 text-sm text-slate-400">Last EA sync received 2 minutes ago.</p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Subscriptions</div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <WalletCards className="h-4 w-4 text-[#f4c77d]" />
              Professional plan
            </div>
            <p className="mt-2 text-sm text-slate-400">Renewal due in 19 days with 10 linked account slots.</p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Protection</div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Shield className="h-4 w-4 text-[#8cc9c2]" />
              Guardrails armed
            </div>
            <p className="mt-2 text-sm text-slate-400">Kill switch and drawdown controls are ready across active licenses.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total P&L"
          value="$12,450.20"
          trend="+12.5%"
          trendUp={true}
          icon={<TrendingUp className="h-5 w-5 text-[#8cc9c2]" />}
          tone="teal"
        />
        <StatsCard
          title="Win Rate"
          value="68.4%"
          trend="+2.1%"
          trendUp={true}
          icon={<Zap className="h-5 w-5 text-[#f4c77d]" />}
          tone="amber"
        />
        <StatsCard
          title="Active EAs"
          value="4"
          trend="Stable"
          trendUp={true}
          icon={<Activity className="h-5 w-5 text-sky-300" />}
          tone="slate"
        />
        <StatsCard
          title="Max Drawdown"
          value="4.2%"
          trend="-0.8%"
          trendUp={false}
          icon={<Shield className="h-5 w-5 text-rose-300" />}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg text-white">Equity Curve</CardTitle>
                <p className="mt-1 text-sm text-slate-400">7-day view across active strategy accounts.</p>
              </div>
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                Updated live
              </Badge>
            </CardHeader>
              <CardContent>
              <PnLChart />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full rounded-[32px] border-white/8 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
              <p className="text-sm text-slate-400">Latest trade, heartbeat, and risk events.</p>
            </CardHeader>
            <CardContent>
              <RecentTrades />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
