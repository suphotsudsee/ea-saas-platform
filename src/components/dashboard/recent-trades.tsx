'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const MOCK_ACTIVITY = [
  { id: '1', event: 'Trade Closed', symbol: 'EURUSD', profit: '+$30.00', time: '2m ago', type: 'profit' },
  { id: '2', event: 'Heartbeat Received', symbol: 'MT4-84729', profit: 'Online', time: '5m ago', type: 'info' },
  { id: '3', event: 'Trade Closed', symbol: 'GBPUSD', profit: '+$10.00', time: '15m ago', type: 'profit' },
  { id: '4', event: 'Risk Alert', symbol: 'USDJPY', profit: 'Slippage', time: '1h ago', type: 'warning' },
];

export function RecentTrades() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="border-white/8">
            <TableHead className="text-slate-500">Event</TableHead>
            <TableHead className="text-slate-500">Signal</TableHead>
            <TableHead className="text-right text-slate-500">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_ACTIVITY.map((act) => (
            <TableRow key={act.id} className="border-white/8 transition-colors hover:bg-white/[0.03]">
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{act.event}</span>
                  <span className="text-xs text-slate-500">{act.symbol}</span>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                    act.type === 'profit'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : act.type === 'warning'
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-white/[0.05] text-slate-300'
                  )}
                >
                  {act.profit}
                </span>
              </TableCell>
              <TableCell className="text-right text-xs text-slate-500">{act.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
