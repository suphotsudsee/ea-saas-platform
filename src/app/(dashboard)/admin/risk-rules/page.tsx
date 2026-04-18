'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Activity, ShieldAlert, Zap } from 'lucide-react';

const MOCK_RISK_ACCOUNTS = [
  { id: 'ta1', account: '84729103', customer: 'John Doe', drawdown: '18.5%', limit: '20%', status: 'WARNING' },
  { id: 'ta2', account: '10293847', customer: 'Sarah Smith', drawdown: '25.1%', limit: '20%', status: 'CRITICAL' },
  { id: 'ta3', account: '55667788', customer: 'Mike Ross', drawdown: '2.1%', limit: '20%', status: 'NORMAL' },
];

function statusClass(status: string) {
  if (status === 'CRITICAL') return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
  if (status === 'WARNING') return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
}

export default function AdminRiskPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Risk management</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Escalate account risk before it becomes an operational incident.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            Use this view to spot drawdown breaches, identify customers near hard limits, and intervene fast when strategy behavior shifts.
          </p>
        </div>
        <Button variant="outline" className="rounded-full border-rose-500/20 bg-rose-500/5 px-5 text-rose-300 hover:bg-rose-500/10">
          <ShieldAlert className="mr-2 h-4 w-4" />
          Global kill switch
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Critical accounts</div>
              <div className="mt-2 text-3xl font-semibold text-white">12</div>
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
              <div className="mt-2 text-3xl font-semibold text-white">45</div>
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
              <div className="mt-2 text-3xl font-semibold text-white">1,204</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        {MOCK_RISK_ACCOUNTS.map((acc) => (
          <Card key={acc.id} className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_0.9fr_0.7fr_0.7fr_auto] lg:items-center">
              <div>
                <div className="text-sm font-semibold text-white">{acc.account}</div>
                <div className="mt-1 text-xs text-slate-500">Account number</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{acc.customer}</div>
                <div className="mt-1 text-xs text-slate-500">Customer</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Drawdown</div>
                <div className="mt-2 text-lg font-semibold text-white">{acc.drawdown}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Limit</div>
                <div className="mt-2 text-lg font-semibold text-white">{acc.limit}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statusClass(acc.status)}>{acc.status}</Badge>
                <Button variant="outline" className="rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10">
                  Kill EA
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
