'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Plus, Trash2, Link as LinkIcon, Unlink } from 'lucide-react';
import { useState } from 'react';

const MOCK_ACCOUNTS = [
  { id: 'ta1', number: '84729103', broker: 'IC Markets', platform: 'MT4', status: 'ACTIVE', lastHeartbeat: '2 mins ago', equity: '$12,400.00' },
  { id: 'ta2', number: '10293847', broker: 'Pepperstone', platform: 'MT5', status: 'STALE', lastHeartbeat: '15 mins ago', equity: '$5,200.00' },
  { id: 'ta3', number: '55667788', broker: 'RoboForex', platform: 'MT4', status: 'OFFLINE', lastHeartbeat: '2 hours ago', equity: '$25,000.00' },
];

export default function TradingAccountsPage() {
  const [isLinking, setIsLinking] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Accounts</h1>
          <p className="text-slate-400">Link your brokerage accounts to your licenses.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700" 
          onClick={() => setIsLinking(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Link New Account
        </Button>
      </div>

      {isLinking && (
        <Card className="border-blue-500/50 bg-blue-500/5 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Link Account</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsLinking(false)}>✕</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="Account Number" className="bg-slate-900 border-slate-700 text-white" />
            <Input placeholder="Broker Name" className="bg-slate-900 border-slate-700 text-white" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300">MT4</Button>
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300">MT5</Button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700 px-8">Confirm Linking</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg text-white">Linked Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Account #</TableHead>
                  <TableHead className="text-slate-400">Broker / Platform</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Equity</TableHead>
                  <TableHead className="text-slate-400">Last Heartbeat</TableHead>
                  <TableHead className="text-right text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_ACCOUNTS.map((acc) => (
                  <TableRow key={acc.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-mono text-white">{acc.number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{acc.broker}</span>
                        <Badge variant="outline" className="text-[10px] px-1 border-slate-700 text-slate-500">
                          {acc.platform}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={cn(
                          acc.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          acc.status === 'STALE' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        )}
                      >
                        {acc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium">{acc.equity}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{acc.lastHeartbeat}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-900/20">
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
