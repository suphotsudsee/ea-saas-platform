'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Search } from 'lucide-react';

const MOCK_TRADES = [
  { id: 't1', ticket: '123456', symbol: 'EURUSD', direction: 'BUY', open: '1.0850', close: '1.0880', volume: '0.10', profit: 30, date: '2026-04-15 14:30' },
  { id: 't2', ticket: '123457', symbol: 'GBPUSD', direction: 'SELL', open: '1.2610', close: '1.2590', volume: '0.05', profit: 10, date: '2026-04-15 12:15' },
  { id: 't3', ticket: '123458', symbol: 'USDJPY', direction: 'BUY', open: '151.20', close: '151.10', volume: '0.10', profit: -10, date: '2026-04-14 09:45' },
  { id: 't4', ticket: '123459', symbol: 'XAUUSD', direction: 'BUY', open: '2340.50', close: '2355.00', volume: '0.01', profit: 145, date: '2026-04-14 05:20' },
  { id: 't5', ticket: '123460', symbol: 'EURJPY', direction: 'SELL', open: '163.40', close: '163.60', volume: '0.10', profit: -20, date: '2026-04-13 22:10' },
];

export default function TradeHistoryPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Trade log</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Review closed trades with clean filtering and fast export.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            Useful when support needs to validate execution behavior or a strategy owner needs to review recent outcomes quickly.
          </p>
        </div>
        <Button className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </section>

      <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-white">Trade history</CardTitle>
            <p className="mt-1 text-sm text-slate-400">All closed positions across connected accounts.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input placeholder="Filter by ticket or symbol" className="rounded-2xl border-white/10 bg-[#0c1720] pl-9 text-white" />
            </div>
            <Button variant="outline" className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]">
              <Filter className="mr-2 h-4 w-4" />
              Date range
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_TRADES.map((trade) => (
            <div key={trade.id} className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.9fr_0.8fr] lg:items-center">
              <div>
                <div className="text-sm font-semibold text-white">{trade.symbol}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">Ticket {trade.ticket}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={trade.direction === 'BUY' ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}>
                  {trade.direction}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.02] text-slate-300">
                  Vol {trade.volume}
                </Badge>
              </div>
              <div className="text-sm text-slate-400">
                <div>Open {trade.open}</div>
                <div>Close {trade.close}</div>
              </div>
              <div className={`text-lg font-semibold ${trade.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {trade.profit >= 0 ? `+$${trade.profit.toFixed(2)}` : `-$${Math.abs(trade.profit).toFixed(2)}`}
              </div>
              <div className="text-sm text-slate-500">{trade.date}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
