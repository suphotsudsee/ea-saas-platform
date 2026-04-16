'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, History, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const MOCK_PAYMENTS = [
  { id: 'p1', amount: '$49.00', date: '2026-04-01', status: 'COMPLETED', invoice: 'INV-2026-001' },
  { id: 'p2', amount: '$49.00', date: '2026-03-01', status: 'COMPLETED', invoice: 'INV-2026-000' },
];

export default function SubscriptionPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscription & Billing</h1>
          <p className="text-slate-400">Manage your plan, payment methods and billing history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <Card className="lg:col-span-1 border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 uppercase font-bold">Professional Plan</p>
              <h2 className="text-4xl font-bold text-white my-2">$49<span className="text-lg text-slate-500">/mo</span></h2>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>
            </div>
            
            <div className="space-y-3 border-t border-slate-800 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Next Billing Date</span>
                <span className="text-slate-200 font-medium">May 1, 2026</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Payment Method</span>
                <span className="text-slate-200 font-medium">Visa •••• 4242</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className="text-green-400 font-medium">Auto-renewing</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-6">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Upgrade
              </Button>
              <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                Cancel Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method & History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg text-white">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs">VISA</div>
                  <div>
                    <p className="text-sm font-medium text-white">Visa ending in 4242</p>
                    <p className="text-xs text-slate-500">Expires 12/27</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">Edit</Button>
              </div>
              <Button variant="outline" className="w-full mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
                Add New Card
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Billing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_PAYMENTS.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-full">
                        {pay.status === 'COMPLETED' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{pay.date}</p>
                        <p className="text-xs text-slate-500">{pay.invoice}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-white">{pay.amount}</span>
                      <Button variant="ghost" size="sm" className="text-xs text-blue-400 hover:text-blue-300">
                        Invoice PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
