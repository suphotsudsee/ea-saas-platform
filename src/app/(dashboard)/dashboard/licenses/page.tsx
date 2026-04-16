'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Plus, Copy, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const MOCK_LICENSES = [
  { id: '1', key: 'ea-550e8400-e29b-41d4-a716-446655440000', strategy: 'Golden-Scalper V2', status: 'ACTIVE', expiry: '2026-12-31', accounts: 2 },
  { id: '2', key: 'ea-a1b2c3d4-e5f6-4g7h-8i9j-k0l1m2n3o4p5', strategy: 'Trend-Master Pro', status: 'PAUSED', expiry: '2026-08-15', accounts: 1 },
  { id: '3', key: 'ea-f9e8d7c6-b5a4-3210-9876-543210fedcba', strategy: 'Grid-Warrior Alpha', status: 'EXPIRED', expiry: '2026-01-01', accounts: 0 },
];

export default function LicensesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Licenses</h1>
          <p className="text-slate-400">Manage your EA access keys and activations.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Request New License
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_LICENSES.map((lic) => (
          <Card key={lic.id} className="border-slate-800 bg-slate-900 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Key className="w-5 h-5 text-blue-400" />
                </div>
                <Badge 
                  className={cn(
                    lic.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    lic.status === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  )}
                >
                  {lic.status}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-4 text-white">{lic.strategy}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-md border border-slate-800 flex items-center justify-between font-mono text-xs text-slate-400">
                <span className="truncate">{lic.key.substring(0, 12)}...</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 hover:bg-slate-800"
                  onClick={() => copyKey(lic.id, lic.key)}
                >
                  {copiedId === lic.id ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-slate-500">
                  <p className="text-xs uppercase font-semibold">Expires</p>
                  <p className="text-slate-300">{lic.expiry}</p>
                </div>
                <div className="text-slate-500">
                  <p className="text-xs uppercase font-semibold">Accounts</p>
                  <p className="text-slate-300">{lic.accounts} Linked</p>
                </div>
              </div>
            </CardContent>
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-slate-400 border-slate-700 hover:bg-slate-800">
                View Detail
              </Button>
              <Button variant="destructive" size="sm" className="bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40">
                <Trash2 className="w-3 h-3 mr-1" />
                Revoke
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
