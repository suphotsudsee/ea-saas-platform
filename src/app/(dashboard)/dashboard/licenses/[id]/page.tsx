'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, KeyRound, ShieldCheck, WalletCards } from 'lucide-react';
import api from '@/lib/api';

interface LicenseDetail {
  id: string;
  key: string;
  status: string;
  expiresAt: string;
  maxAccounts: number;
  killSwitch: boolean;
  killSwitchReason: string | null;
  strategy: {
    name: string;
    version: string;
    description: string | null;
  };
  subscription: {
    status: string;
    package: {
      name: string;
      maxAccounts: number;
    };
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

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>();
  const [license, setLicense] = useState<LicenseDetail | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    api.get(`/licenses/${params.id}`).then((res) => setLicense(res.data.license ?? null)).catch(() => setLicense(null));
  }, [params?.id]);

  if (!license) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/licenses" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to licenses
        </Link>
        <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-8 text-sm text-slate-400">License detail not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <Link href="/dashboard/licenses" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to licenses
      </Link>

      <section className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={statusClass(license.status)}>{license.status}</Badge>
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">License detail</Badge>
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">{license.strategy.name}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          Version {license.strategy.version} · Package {license.subscription.package.name}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <KeyRound className="h-4 w-4" />
              License key
            </div>
            <div className="mt-3 break-all font-mono text-sm text-white">{license.key}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <WalletCards className="h-4 w-4" />
              Linked accounts
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">{license.tradingAccounts.length}</div>
            <div className="mt-2 text-sm text-slate-500">Max {license.maxAccounts} accounts</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Protection
            </div>
            <div className="mt-3 text-lg font-semibold text-white">{license.killSwitch ? 'Kill switch active' : 'Kill switch ready'}</div>
            <div className="mt-2 text-sm text-slate-500">{license.killSwitchReason || 'No active kill switch reason.'}</div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-xl text-white">Linked trading accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {license.tradingAccounts.length === 0 && (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-5 text-sm text-slate-400">
              No linked trading accounts yet.
            </div>
          )}

          {license.tradingAccounts.map((account) => (
            <div key={account.id} className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1fr_1fr_0.8fr]">
              <div>
                <div className="text-sm font-semibold text-white">{account.accountNumber}</div>
                <div className="mt-1 text-xs text-slate-500">{account.brokerName} · {account.platform}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Heartbeat</div>
                <div className="mt-2 text-sm text-white">
                  {account.lastHeartbeatAt ? new Date(account.lastHeartbeatAt).toLocaleString('en-US') : 'No heartbeat yet'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
                <Badge className={`mt-2 ${statusClass(account.status)}`}>{account.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
