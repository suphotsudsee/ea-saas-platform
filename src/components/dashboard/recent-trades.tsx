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
          <TableRow className="border-slate-800">
            <TableHead className="text-slate-500">Event</TableHead>
            <TableHead className="text-slate-500">Value</TableHead>
            <TableHead className="text-right text-slate-500">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_ACTIVITY.map((act) => (
            <TableRow key={act.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-medium">{act.event}</span>
                  <span className="text-xs text-slate-500">{act.symbol}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className={cn(
                  act.type === 'profit' ? 'text-green-400' : act.type === 'warning' ? 'text-yellow-400' : 'text-slate-300'
                )}>
                  {act.profit}
                </span>
              </TableCell>
              <TableCell className="text-right text-slate-500 text-xs">{act.time}</TableCell>
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
