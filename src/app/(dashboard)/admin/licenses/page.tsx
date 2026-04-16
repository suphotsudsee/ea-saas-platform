'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, ShieldAlert, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

const MOCK_LICENSES = [
  { id: 'l1', key: 'ea-550e8400-e29b-41d4-a716-446655440000', user: 'John Doe', strategy: 'Golden-Scalper V2', status: 'ACTIVE', expiry: '2026-12-31', accounts: 2 },
  { id: 'l2', key: 'ea-a1b2c3d4-e5f6-4g7h-8i9j-k0l1m2n3o4p5', user: 'Sarah Smith', strategy: 'Trend-Master Pro', status: 'PAUSED', expiry: '2026-08-15', accounts: 1 },
  { id: 'l3', key: 'ea-f9e8d7c6-b5a4-3210-9876-543210fedcba', user: 'Mike Ross', strategy: 'Grid-Warrior Alpha', status: 'EXPIRED', expiry: '2026-01-01', accounts: 0 },
];

export default function AdminLicensesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">License Management</h1>
          <p className="text-slate-400">Full administrative control over all issued license keys.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Issue Manual License
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg text-white">All Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">License Key</TableHead>
                <TableHead className="text-slate-400">Customer</TableHead>
                <TableHead className="text-slate-400">Strategy</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Expiry</TableHead>
                <TableHead className="text-right text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LICENSES.map((lic) => (
                <TableRow key={lic.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-400">
                    {lic.key.substring(0, 12)}...
                  </TableCell>
                  <TableCell className="text-white">{lic.user}</TableCell>
                  <TableCell className="text-slate-300">{lic.strategy}</TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        lic.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        lic.status === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      )}
                    >
                      {lic.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">{lic.expiry}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300">
                      Extend
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs border-slate-700 text-yellow-400">
                      Pause
                    </Button>
                    <Button variant="destructive" size="sm" className="text-xs bg-red-900/20 text-red-400 border-red-900/50">
                      Revoke
                    </Button>
                  </TableCell>
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
