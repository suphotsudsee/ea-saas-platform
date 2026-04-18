'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface LicenseItem {
  id: string;
  key: string;
  status: string;
  expiresAt: string;
  killSwitch: boolean;
  strategy: {
    id: string;
    name: string;
    version: string;
  };
  tradingAccounts: Array<{
    id: string;
    accountNumber: string;
    brokerName: string;
    platform: string;
    status: string;
    lastHeartbeatAt: string | null;
  }>;
}

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'PAUSED') return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
}

export default function LicensesPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .get('/licenses/list')
      .then((res) => setLicenses(res.data.licenses ?? []))
      .catch(() => setLicenses([]));
  }, []);

  const copyKey = async (id: string, key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDeleteClick = () => {
    setNotice('License deletion is not available from the trader dashboard. Use admin controls or contact support.');
  };

  const activeLicenses = useMemo(() => licenses.filter((license) => license.status === 'ACTIVE'), [licenses]);
  const expiringSoon = useMemo(() => {
    const now = Date.now();
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    return licenses.filter((license) => new Date(license.expiresAt).getTime() - now <= twoWeeks).length;
  }, [licenses]);
  const linkedAccounts = useMemo(
    () => licenses.reduce((sum, license) => sum + license.tradingAccounts.length, 0),
    [licenses]
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">License control</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Manage every issued access key from one place.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            Track activation state, linked account usage, and renewal timing without digging through support history.
          </p>
        </div>
        <Button
          className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]"
          onClick={() => router.push('/dashboard/subscription')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Request new license
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Active keys</div>
            <div className="mt-3 text-3xl font-semibold text-white">{activeLicenses.length}</div>
            <p className="mt-2 text-sm text-slate-400">{linkedAccounts} linked accounts currently attached to licenses.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Expiring soon</div>
            <div className="mt-3 text-3xl font-semibold text-white">{expiringSoon}</div>
            <p className="mt-2 text-sm text-slate-400">Licenses reaching renewal window within the next 14 days.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Protection state</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-white">
              <ShieldCheck className="h-5 w-5 text-[#8cc9c2]" />
              {licenses.some((license) => license.killSwitch) ? 'Kill switch active' : 'Kill switch ready'}
            </div>
            <p className="mt-2 text-sm text-slate-400">Protection state reflects actual license records, not mock values.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {notice ? (
          <Card className="rounded-[30px] border-amber-500/20 bg-amber-500/5 xl:col-span-3">
            <CardContent className="p-6 text-sm text-amber-100">{notice}</CardContent>
          </Card>
        ) : null}

        {licenses.length === 0 && (
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03] xl:col-span-3">
            <CardContent className="p-8 text-sm text-slate-400">No license records found for this account yet.</CardContent>
          </Card>
        )}

        {licenses.map((lic) => (
          <Card key={lic.id} className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112129] text-[#8cc9c2]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <Badge className={statusClass(lic.status)}>{lic.status}</Badge>
              </div>
              <CardTitle className="pt-4 text-xl text-white">{lic.strategy.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">License key</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs text-slate-300">{lic.key}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full border border-white/10 p-0 hover:bg-white/[0.06]"
                    onClick={() => copyKey(lic.id, lic.key)}
                  >
                    {copiedId === lic.id ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Expiry</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {new Date(lic.expiresAt).toLocaleDateString('en-US')}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Linked accounts</div>
                  <div className="mt-2 text-sm font-semibold text-white">{lic.tradingAccounts.length}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]">
                  <Link href={`/dashboard/licenses/${lic.id}`}>View details</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10"
                  onClick={handleDeleteClick}
                  title="Admin-only action"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
