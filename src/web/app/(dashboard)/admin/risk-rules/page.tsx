'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Activity, AlertTriangle, Zap } from 'lucide-react';
import { useState } from 'react';

const MOCK_RISK_ACCOUNTS = [
  { id: 'ta1', account: '84729103', customer: 'John Doe', drawdown: '18.5%', limit: '20%', status: 'WARNING', riskLevel: 'HIGH' },
  { id: 'ta2', account: '10293847', customer: 'Sarah Smith', drawdown: '25.1%', limit: '20%', status: 'CRITICAL', riskLevel: 'CRITICAL' },
  { id: 'ta3', account: '55667788', customer: 'Mike Ross', drawdown: '2.1%', limit: '20%', status: 'NORMAL', riskLevel: 'LOW' },
];

export default function AdminRiskPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Risk Management</h1>
          <p className="text-slate-400">Monitor account exposure and enforce global risk rules.</p>
        </div>
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700 px-6">
          <ShieldAlert className="w-4 h-4 mr-2" />
          Global Kill Switch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900 p-6 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Critical Accounts</p>
            <h3 className="text-2xl font-bold text-white">12</h3>
          </div>
        </Card>
        <Card className="border-slate-800 bg-slate-900 p-6 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Warning Accounts</p>
            <h3 className="text-2xl font-bold text-white">45</h3>
          </div>
        </Card>
        <Card className="border-slate-800 bg-slate-900 p-6 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg">
            <Zap className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Healthy Accounts</p>
            <h3 className="text-2xl font-bold text-white">1,204</h3>
          </div>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg text-white">High Risk Exposure</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Account #</TableHead>
                <TableHead className="text-slate-400">Customer</TableHead>
                <TableHead className="text-slate-400">Drawdown</TableHead>
                <TableHead className="text-slate-400">Limit</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-right text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RISK_ACCOUNTS.map((acc) => (
                <TableRow key={acc.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-mono text-white">{acc.account}</TableCell>
                  <TableCell className="text-slate-300">{acc.customer}</TableCell>
                  <TableCell className={cn(
                    'font-bold',
                    acc.status === 'CRITICAL' ? 'text-red-400' : acc.status === 'WARNING' ? 'text-yellow-400' : 'text-green-400'
                  )}>
                    {acc.drawdown}
                  </TableCell>
                  <TableCell className="text-slate-500">{acc.limit}</TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        acc.status === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        acc.status === 'WARNING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                        'bg-green-500/10 text-green-400 border-green-500/20'
                      )}
                    >
                      {acc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                      Kill EA
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
