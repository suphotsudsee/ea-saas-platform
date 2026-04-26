'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
interface ActivityRow {
  id: string;
  event: string;
  symbol: string;
  signal: string;
  time: string;
  type: 'profit' | 'warning' | 'info';
}

export function RecentTrades({ items }: { items: ActivityRow[] }) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="border-white/8">
            <TableHead className="text-amber-500/60">Event</TableHead>
            <TableHead className="text-amber-500/60">Signal</TableHead>
            <TableHead className="text-right text-amber-500/60">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow className="border-white/8">
              <TableCell colSpan={3} className="py-8 text-center text-sm text-slate-500">
                No recent trade activity yet.
              </TableCell>
            </TableRow>
          )}

          {items.map((act) => (
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
                        : 'bg-amber-500/10 text-amber-300'
                  )}
                >
                  {act.signal}
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
