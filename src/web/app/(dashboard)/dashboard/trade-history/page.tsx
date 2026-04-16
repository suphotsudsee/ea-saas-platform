'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Filter, Calendar } from 'lucide-react';
import { useState } from 'react';

const MOCK_TRADES = [
  { id: 't1', ticket: '123456', symbol: 'EURUSD', direction: 'BUY', open: '1.0850', close: '1.0880', volume: '0.10', profit: '30.00', date: '2026-04-15 14:30' },
  { id: 't2', ticket: '123457', symbol: 'GBPUSD', direction: 'SELL', open: '1.2610', close: '1.2590', volume: '0.05', profit: '10.00', date: '2026-04-15 12:15' },
  { id: 't3', ticket: '123458', symbol: 'USDJPY', direction: 'BUY', open: '151.20', close: '151.10', volume: '0.10', profit: '-10.00', date: '2026-04-14 09:45' },
  { id: 't4', ticket: '123459', symbol: 'XAUUSD', direction: 'BUY', open: '2340.50', close: '2355.00', volume: '0.01', profit: '145.00', date: '2026-04-14 05:20' },
  { id: 't5', ticket: '123460', symbol: 'EURJPY', direction: 'SELL', open: '163.40', close: '163.60', volume: '0.10', profit: '-20.00', date: '2026-04-13 22:10' },
];

export default function TradeHistoryPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trade History</h1>
          <p className="text-slate-400">Detailed log of all closed trades across your accounts.</p>
        </div>
        <Button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg text-white">Trade Log</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input placeholder="Filter trades..." className="pl-9 bg-slate-800 border-slate-700 text-white w-64" />
              </div>
              <Button variant="outline" className="border-slate-700 text-slate-300">
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Ticket</TableHead>
                <TableHead className="text-slate-400">Symbol</TableHead>
                <TableHead className="text-slate-400">Dir</TableHead>
                <TableHead className="text-slate-400">Open</TableHead>
                <TableHead className="text-slate-400">Close</TableHead>
                <TableHead className="text-slate-400">Vol</TableHead>
                <TableHead className="text-slate-400">Profit</TableHead>
                <TableHead className="text-slate-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_TRADES.map((trade) => (
                <TableRow key={trade.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-mono text-slate-400">{trade.ticket}</TableCell>
                  <TableCell className="text-white font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    <span className={cn(
                      trade.direction === 'BUY' ? 'text-blue-400' : 'text-red-400'
                    )}>
                      {trade.direction}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300">{trade.open}</TableCell>
                  <TableCell className="text-slate-300">{trade.close}</TableCell>
                  <TableCell className="text-slate-300">{trade.volume}</TableCell>
                  <TableCell className={cn(
                    'font-bold',
                    parseFloat(trade.profit) >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {trade.profit >= 0 ? `+$${trade.profit}` : `-$${Math.abs(parseFloat(trade.profit))}`}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{trade.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
