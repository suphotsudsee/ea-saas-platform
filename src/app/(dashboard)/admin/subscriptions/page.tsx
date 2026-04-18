'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

interface SubscriptionItem {
  id: string;
  status: string;
  currentPeriodEnd: string;
  user: {
    email: string;
    name: string | null;
  };
  package: {
    name: string;
    billingCycle: string;
    maxAccounts: number;
  };
  licenses: Array<{ id: string; status: string; key: string }>;
}

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'CANCELED') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);

  useEffect(() => {
    api.get('/admin/subscriptions').then((res) => setSubscriptions(res.data.subscriptions ?? [])).catch(() => setSubscriptions([]));
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8">
        <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Billing operations</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Review active subscriptions and account capacity across customers.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          This view reflects real subscription records from the database. If there are no results yet, the billing side has not been populated.
        </p>
      </section>

      <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-xl text-white">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.length === 0 && <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-6 text-sm text-slate-400">No subscription records found.</div>}

          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr]">
              <div>
                <div className="text-sm font-semibold text-white">{subscription.user.name || 'Unnamed customer'}</div>
                <div className="mt-1 text-xs text-slate-500">{subscription.user.email}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Plan</div>
                <div className="mt-2 text-sm font-medium text-white">
                  {subscription.package.name} · {subscription.package.billingCycle}
                </div>
                <div className="mt-1 text-xs text-slate-500">{subscription.package.maxAccounts} account slots</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
                <Badge className={`mt-2 ${statusClass(subscription.status)}`}>{subscription.status}</Badge>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current period end</div>
                <div className="mt-2 text-sm font-medium text-white">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US')}
                </div>
                <div className="mt-1 text-xs text-slate-500">{subscription.licenses.length} linked licenses</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
