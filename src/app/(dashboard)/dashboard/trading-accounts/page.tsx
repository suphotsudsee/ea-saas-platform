'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Activity, Link as LinkIcon, Plus, Unlink, WalletCards, X } from 'lucide-react';

const MOCK_ACCOUNTS = [
  { id: 'ta1', number: '84729103', broker: 'IC Markets', platform: 'MT4', status: 'ACTIVE', lastHeartbeat: '2 mins ago', equity: '$12,400.00' },
  { id: 'ta2', number: '10293847', broker: 'Pepperstone', platform: 'MT5', status: 'STALE', lastHeartbeat: '15 mins ago', equity: '$5,200.00' },
  { id: 'ta3', number: '55667788', broker: 'RoboForex', platform: 'MT4', status: 'OFFLINE', lastHeartbeat: '2 hours ago', equity: '$25,000.00' },
];

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'STALE') return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
}

export default function TradingAccountsPage() {
  const [isLinking, setIsLinking] = useState(false);
  const [platform, setPlatform] = useState<'MT4' | 'MT5'>('MT4');

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Account linking</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Connect brokerage accounts and watch live heartbeat state.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            This page keeps platform, broker, and license relationships visible so support and ops can react quickly.
          </p>
        </div>
        <Button className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]" onClick={() => setIsLinking(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Link new account
        </Button>
      </section>

      {isLinking && (
        <Card className="rounded-[32px] border-[#8cc9c2]/20 bg-[#10252a]/35">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl text-white">Link trading account</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Attach a new broker account to the platform and choose the MetaTrader version.</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full border border-white/10" onClick={() => setIsLinking(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Input placeholder="Account number" className="rounded-2xl border-white/10 bg-[#081118] text-white" />
              <Input placeholder="Broker name" className="rounded-2xl border-white/10 bg-[#081118] text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className={`rounded-2xl border-white/10 ${platform === 'MT4' ? 'bg-white/[0.08] text-white' : 'bg-transparent text-slate-300'}`}
                  onClick={() => setPlatform('MT4')}
                >
                  MT4
                </Button>
                <Button
                  variant="outline"
                  className={`rounded-2xl border-white/10 ${platform === 'MT5' ? 'bg-white/[0.08] text-white' : 'bg-transparent text-slate-300'}`}
                  onClick={() => setPlatform('MT5')}
                >
                  MT5
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full bg-[#e3a84f] px-6 text-[#14110c] hover:bg-[#efb65d]">
                <LinkIcon className="mr-2 h-4 w-4" />
                Confirm linking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Connected accounts</div>
            <div className="mt-3 text-3xl font-semibold text-white">3</div>
            <p className="mt-2 text-sm text-slate-400">2 accounts are feeding healthy heartbeats right now.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Platform mix</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-white">
              <WalletCards className="h-5 w-5 text-[#f4c77d]" />
              2 MT4 / 1 MT5
            </div>
            <p className="mt-2 text-sm text-slate-400">Version visibility matters when debugging deployment issues.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Connection state</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-white">
              <Activity className="h-5 w-5 text-[#8cc9c2]" />
              One stale feed
            </div>
            <p className="mt-2 text-sm text-slate-400">Review delayed heartbeat accounts before they drift out of sync.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {MOCK_ACCOUNTS.map((acc) => (
          <Card key={acc.id} className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-white">{acc.number}</CardTitle>
                  <p className="mt-2 text-sm text-slate-400">
                    {acc.broker} · {acc.platform}
                  </p>
                </div>
                <Badge className={statusClass(acc.status)}>{acc.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Last heartbeat</div>
                <div className="mt-2 text-sm font-semibold text-white">{acc.lastHeartbeat}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Equity</div>
                <div className="mt-2 text-sm font-semibold text-white">{acc.equity}</div>
              </div>
              <Button variant="outline" className="w-full rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10">
                <Unlink className="mr-2 h-4 w-4" />
                Unlink account
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
