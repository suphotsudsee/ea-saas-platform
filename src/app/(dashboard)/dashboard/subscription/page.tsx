'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Copy, FileText, Wallet } from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';

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

interface BillingPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  depositAddress: string | null;
  depositNetwork: string | null;
  txHash: string | null;
  verifiedAt: string | null;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface PendingDeposit {
  paymentId: string;
  depositAddress: string;
  network: 'ERC-20' | 'TRC-20' | 'BEP-20';
  amount: number;
  currency: string;
  status?: string;
  expiresAt: string;
  paymentMemo?: string;
  packageName?: string;
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatUsdt(amount: number) {
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} USDT`;
}

function formatCycle(cycle: string) {
  if (cycle === 'MONTHLY') return '/mo';
  if (cycle === 'QUARTERLY') return '/qtr';
  if (cycle === 'YEARLY') return '/yr';
  return '';
}

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-300';
  if (status === 'AWAITING_DEPOSIT' || status === 'PENDING') return 'bg-amber-500/10 text-amber-300';
  return 'bg-rose-500/10 text-rose-300';
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'ERC-20' | 'TRC-20' | 'BEP-20'>('ERC-20');
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [paymentMethodMessage, setPaymentMethodMessage] = useState<string | null>(null);

  async function loadBilling() {
    const results = await Promise.allSettled([
      api.get('/subscriptions/current'),
      api.get('/subscriptions/list'),
      api.get('/payments/history'),
      api.get('/payments/create-deposit'),
    ]);

    const currentResult = results[0];
    setSubscription(currentResult.status === 'fulfilled' ? currentResult.value.data.subscription ?? null : null);

    const packagesResult = results[1];
    setPackages(packagesResult.status === 'fulfilled' ? packagesResult.value.data.packages ?? [] : []);

    const paymentsResult = results[2];
    setPayments(paymentsResult.status === 'fulfilled' ? paymentsResult.value.data.data ?? [] : []);

    const pendingResult = results[3];
    setPendingDeposit(pendingResult.status === 'fulfilled' ? pendingResult.value.data.data ?? null : null);
  }

  useEffect(() => {
    loadBilling();
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

  async function handleCreateDeposit() {
    if (!upgradePackage) {
      setDepositError('No higher package is available for this account.');
      return;
    }

    try {
      setCreatingDeposit(true);
      setDepositError(null);
      setPaymentMethodMessage(null);

      const response = await api.post('/payments/create-deposit', {
        packageId: upgradePackage.id,
        network: selectedNetwork,
      });

      setPendingDeposit(response.data?.data ?? null);
      setPaymentMethodMessage('USDT deposit order created. Please transfer the exact amount to the address shown.');
      await loadBilling();
    } catch (error) {
      setDepositError(getApiErrorMessage(error, 'Failed to create USDT deposit.'));
    } finally {
      setCreatingDeposit(false);
    }
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setPaymentMethodMessage(`${label} copied to clipboard`);
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[32px] border-amber-900/30 bg-[linear-gradient(135deg,#0f172a_0%,#17120d_100%)]">
          <CardContent className="p-6 sm:p-8">
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10">
              USDT billing
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {currentPackage ? `${currentPackage.name} plan paid by USDT.` : 'Choose a package and pay with USDT.'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
              Transfer USDT to the deposit address generated by the system. The license will be activated once the transaction is confirmed.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-900/30 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Current plan</div>
                <div className="mt-2 text-xl font-semibold text-white">{currentPackage?.name || 'No active plan'}</div>
              </div>
              <div className="rounded-2xl border border-amber-900/30 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Renewal</div>
                <div className="mt-2 text-xl font-semibold text-white">{renewalText}</div>
              </div>
              <div className="rounded-2xl border border-amber-900/30 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-amber-500/60">Rate</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {currentPackage ? `${currentPrice}${currentCycle}` : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-amber-900/30 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Wallet className="h-5 w-5 text-amber-300" />
              Current plan state
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-semibold text-white">{currentPrice}</div>
              <div className="mt-1 text-sm text-slate-500">
                {currentPackage ? currentPackage.billingCycle.toLowerCase() : 'no active billing cycle'}
              </div>
              <Badge className="mt-4 border-amber-500/30 bg-amber-500/10 text-amber-300">
                {subscription
                  ? `${subscription.status} • ${subscription.cancelAtPeriodEnd ? 'canceling at period end' : 'USDT billing'}`
                  : 'No active subscription'}
              </Badge>
            </div>

            <div className="space-y-3 rounded-2xl border border-amber-900/30 bg-[#0c1720] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Payment method</span>
                <span className="font-medium text-white">USDT deposit</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Seats included</span>
                <span className="font-medium text-white">{currentPackage?.maxAccounts ?? 0} accounts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Next upgrade</span>
                <span className="font-medium text-amber-300">{upgradePackage?.name || 'Already highest plan'}</span>
              </div>
            </div>

            <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
              <select
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                value={selectedNetwork}
                onChange={(event) => setSelectedNetwork(event.target.value as 'ERC-20' | 'TRC-20' | 'BEP-20')}
              >
                <option className="bg-slate-950" value="ERC-20">ERC-20</option>
                <option className="bg-slate-950" value="TRC-20">TRC-20</option>
                <option className="bg-slate-950" value="BEP-20">BEP-20</option>
              </select>
              <Button
                variant="outline"
                className="rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                onClick={handleCreateDeposit}
                disabled={creatingDeposit || !upgradePackage}
              >
                {creatingDeposit ? 'Creating deposit...' : upgradePackage ? `Pay ${upgradePackage.name} with USDT` : 'No higher plan'}
              </Button>
            </div>
            {depositError ? <div className="text-sm text-rose-300">{depositError}</div> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[30px] border-amber-900/30 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">USDT payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-amber-900/30 bg-[#0c1720] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-xs font-bold text-amber-300">
                  USDT
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">USDT only</div>
                  <div className="text-xs text-slate-500">
                    Transfer USDT using the selected network only. Do not send other coins or use a different network.
                  </div>
                </div>
              </div>
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">Deposit</Badge>
            </div>

            {pendingDeposit ? (
              <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Amount</span>
                  <span className="font-semibold text-amber-200">{formatUsdt(pendingDeposit.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Network</span>
                  <span className="font-semibold text-white">{pendingDeposit.network}</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Deposit address</div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-left font-mono text-xs text-white hover:border-amber-500/40"
                    onClick={() => copyText(pendingDeposit.depositAddress, 'address')}
                  >
                    <span className="truncate">{pendingDeposit.depositAddress}</span>
                    <Copy className="h-4 w-4 shrink-0 text-amber-300" />
                  </button>
                </div>
                {pendingDeposit.paymentMemo ? (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Reference memo</div>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-left font-mono text-xs text-white hover:border-amber-500/40"
                      onClick={() => copyText(pendingDeposit.paymentMemo || '', 'memo')}
                    >
                      <span>{pendingDeposit.paymentMemo}</span>
                      <Copy className="h-4 w-4 text-amber-300" />
                    </button>
                  </div>
                ) : null}
                <div className="text-xs leading-5 text-amber-200">
                  Send USDT exclusively on {pendingDeposit.network}. The amount must match exactly what is specified.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4 text-sm text-slate-400">
                No pending transfer yet. Select a package and click "Pay with USDT" to create a deposit address.
              </div>
            )}

            {paymentMethodMessage ? <div className="text-sm text-amber-300">{paymentMethodMessage}</div> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-amber-900/30 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">USDT payment history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? (
              <div className="rounded-2xl border border-amber-900/30 bg-[#0c1720] p-4 text-sm text-slate-400">
                No USDT payment history found yet.
              </div>
            ) : (
              payments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between rounded-2xl border border-amber-900/30 bg-[#0c1720] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{formatUsdt(pay.amount)}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(pay.createdAt).toLocaleDateString('en-US')} • {pay.depositNetwork || pay.paymentMethod} • {pay.txHash || pay.description || pay.status}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" className={`rounded-full ${statusTone(pay.status)}`} disabled>
                    <FileText className="mr-2 h-4 w-4" />
                    {pay.status}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
