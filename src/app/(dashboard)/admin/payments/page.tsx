'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

interface PaymentRow {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  depositAddress: string | null;
  depositNetwork: string | null;
  txHash: string | null;
  fromAddress: string | null;
  confirmations: number | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  description: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

function statusClass(status: string) {
  if (status === 'COMPLETED') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'PENDING') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (status === 'FAILED' || status === 'EXPIRED') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  return 'border-slate-700 bg-slate-800 text-slate-300';
}

function formatUSDT(amount: number) {
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncateHash(hash: string | null) {
  if (!hash) return '—';
  return hash.substring(0, 10) + '...' + hash.substring(hash.length - 6);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState({ totalPayments: 0, completedPayments: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/payments')
      .then((res) => {
        setPayments(res.data.payments ?? []);
        setSummary(res.data.summary ?? { totalPayments: 0, completedPayments: 0, pendingPayments: 0 });
      })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8">
        <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Payment tracking</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Monitor all USDT deposits and payment activity across the platform.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          Track every deposit: pending payments waiting for blockchain confirmation, completed transactions, and failed/expired deposits.
        </p>
      </section>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Total payments</div>
            <div className="mt-3 text-3xl font-semibold text-white">{summary.totalPayments}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-400">Completed</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-300">{summary.completedPayments}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-400">Pending</div>
            <div className="mt-3 text-3xl font-semibold text-amber-300">{summary.pendingPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-xl text-white">All payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-8 text-sm text-slate-400">Loading payments...</div>
          ) : null}

          {!loading && payments.length === 0 ? (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-6 text-sm text-slate-400">No payment records found.</div>
          ) : null}

          {!loading && payments.map((pay) => (
            <div key={pay.id} className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr] lg:items-center">
              {/* Customer */}
              <div>
                <div className="text-sm font-semibold text-white">{pay.user.name || pay.user.email}</div>
                <div className="mt-1 text-xs text-slate-500">{pay.user.email}</div>
              </div>
              {/* Amount & Currency */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Amount</div>
                <div className="mt-2 text-sm font-mono font-semibold text-white">{formatUSDT(pay.amount)}</div>
              </div>
              {/* Network / Method */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Network</div>
                <div className="mt-2 text-sm text-white">{pay.depositNetwork || pay.paymentMethod}</div>
                <div className="mt-1 text-xs text-slate-500 truncate max-w-[180px]">{truncateHash(pay.txHash)}</div>
              </div>
              {/* Status */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
                <Badge className={`mt-2 ${statusClass(pay.status)}`}>{pay.status}</Badge>
                {pay.confirmations != null ? (
                  <div className="mt-1 text-xs text-slate-500">{pay.confirmations} confirmations</div>
                ) : null}
              </div>
              {/* Date */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Date</div>
                <div className="mt-2 text-sm text-white">{formatDate(pay.createdAt)}</div>
                {pay.verifiedAt ? (
                  <div className="mt-1 text-xs text-emerald-400">✓ Verified {formatDate(pay.verifiedAt)}</div>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
