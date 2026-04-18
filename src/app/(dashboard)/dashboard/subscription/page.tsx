'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CreditCard, FileText, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

const MOCK_PAYMENTS = [
  { id: 'p1', amount: '$49.00', date: '2026-04-01', status: 'COMPLETED', invoice: 'INV-2026-001' },
  { id: 'p2', amount: '$49.00', date: '2026-03-01', status: 'COMPLETED', invoice: 'INV-2026-000' },
];

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  maxAccounts: number;
  sortOrder: number;
}

interface CurrentSubscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd?: boolean;
  package: SubscriptionPackage;
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatCycle(cycle: string) {
  if (cycle === 'MONTHLY') return '/mo';
  if (cycle === 'QUARTERLY') return '/qtr';
  if (cycle === 'YEARLY') return '/yr';
  return '';
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([api.get('/subscriptions/current'), api.get('/subscriptions/list')]).then((results) => {
      if (!mounted) return;

      const currentResult = results[0];
      if (currentResult.status === 'fulfilled') {
        setSubscription(currentResult.value.data.subscription ?? null);
      } else {
        setSubscription(null);
      }

      const packagesResult = results[1];
      if (packagesResult.status === 'fulfilled') {
        setPackages(packagesResult.value.data.packages ?? []);
      } else {
        setPackages([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const currentPackage = subscription?.package ?? null;
  const upgradePackage = useMemo(() => {
    if (!packages.length) return null;
    if (!currentPackage) return packages[0] ?? null;

    const sorted = [...packages].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted.find((pkg) => pkg.sortOrder > currentPackage.sortOrder) ?? null;
  }, [packages, currentPackage]);

  const currentPrice = currentPackage ? formatMoney(currentPackage.priceCents, currentPackage.currency) : '$0';
  const currentCycle = currentPackage ? formatCycle(currentPackage.billingCycle) : '';
  const renewalText = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No active renewal';

  async function handleUpgradePlan() {
    if (!upgradePackage) {
      setUpgradeError('No higher package is available for this account.');
      return;
    }

    try {
      setUpgrading(true);
      setUpgradeError(null);

      const origin = window.location.origin;
      const response = await api.post('/subscriptions/checkout', {
        packageId: upgradePackage.id,
        successUrl: `${origin}/dashboard/subscription?checkout=success`,
        cancelUrl: `${origin}/dashboard/subscription?checkout=cancelled`,
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
        return;
      }

      setUpgradeError('Checkout session was created without a redirect URL.');
    } catch (error: any) {
      setUpgradeError(error?.response?.data?.error || 'Failed to start upgrade checkout.');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[32px] border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)]">
          <CardContent className="p-6 sm:p-8">
            <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Billing overview</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {currentPackage ? `${currentPackage.name} plan with room to scale.` : 'Choose the right package for your trading stack.'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
              Keep billing, renewals, and package state visible so subscription health is never a surprise.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Current plan</div>
                <div className="mt-2 text-xl font-semibold text-white">{currentPackage?.name || 'No active plan'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Renewal</div>
                <div className="mt-2 text-xl font-semibold text-white">{renewalText}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Monthly rate</div>
                <div className="mt-2 text-xl font-semibold text-white">{currentPackage ? `${currentPrice}${currentCycle}` : 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <CreditCard className="h-5 w-5 text-[#f4c77d]" />
              Current plan state
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-semibold text-white">{currentPrice}</div>
              <div className="mt-1 text-sm text-slate-500">
                {currentPackage ? currentPackage.billingCycle.toLowerCase() : 'no active billing cycle'}
              </div>
              <Badge className="mt-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                {subscription ? `${subscription.status} • ${subscription.cancelAtPeriodEnd ? 'canceling at period end' : 'auto-renewing'}` : 'No active subscription'}
              </Badge>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Payment method</span>
                <span className="font-medium text-white">Visa ending 4242</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Seats included</span>
                <span className="font-medium text-white">{currentPackage?.maxAccounts ?? 0} accounts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Next upgrade</span>
                <span className="font-medium text-[#8cc9c2]">{upgradePackage?.name || 'Already highest plan'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
                onClick={handleUpgradePlan}
                disabled={upgrading}
              >
                {upgrading ? 'Starting checkout...' : upgradePackage ? `Upgrade to ${upgradePackage.name}` : 'No higher plan'}
              </Button>
              <Button variant="outline" className="rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10">
                Cancel plan
              </Button>
            </div>
            {upgradeError && <div className="text-sm text-rose-300">{upgradeError}</div>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Payment method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-[#12357a] text-xs font-bold text-white">VISA</div>
                <div>
                  <div className="text-sm font-semibold text-white">Visa ending in 4242</div>
                  <div className="text-xs text-slate-500">Expires 12/27</div>
                </div>
              </div>
              <Button variant="ghost" className="rounded-full text-slate-300 hover:bg-white/[0.06] hover:text-white">
                Edit
              </Button>
            </div>
            <Button variant="outline" className="w-full rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]">
              <RefreshCw className="mr-2 h-4 w-4" />
              Add new card
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Billing history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_PAYMENTS.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{pay.amount}</div>
                    <div className="text-xs text-slate-500">{pay.date} • {pay.invoice}</div>
                  </div>
                </div>
                <Button variant="ghost" className="rounded-full text-slate-300 hover:bg-white/[0.06] hover:text-white">
                  <FileText className="mr-2 h-4 w-4" />
                  Invoice
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
