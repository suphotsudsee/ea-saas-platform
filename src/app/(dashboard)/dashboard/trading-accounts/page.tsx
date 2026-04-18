'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Plus, Unlink, WalletCards } from 'lucide-react';
import api from '@/lib/api';

type AccountState = 'online' | 'stale' | 'offline';

interface TradingAccountStatusItem {
  id: string;
  accountNumber: string;
  brokerName: string;
  platform: 'MT4' | 'MT5';
  status: AccountState;
  lastHeartbeat: string | null;
  equity: number | null;
  balance: number | null;
  openPositions: number | null;
  killSwitch: boolean;
  strategy: {
    name: string;
    version: string;
  };
}

interface TradingAccountsStatusResponse {
  accounts: TradingAccountStatusItem[];
}

function statusClass(status: AccountState) {
  if (status === 'online') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'stale') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
}

function statusLabel(status: AccountState) {
  if (status === 'online') return 'ACTIVE';
  if (status === 'stale') return 'STALE';
  return 'OFFLINE';
}

function formatRelativeTime(value: string | null) {
  if (!value) return 'No heartbeat yet';

  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));

  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return 'No equity data';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function TradingAccountsPage() {
  const [accounts, setAccounts] = useState<TradingAccountStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get<TradingAccountsStatusResponse>('/trading-accounts/status');
        setAccounts(response.data.accounts ?? []);
      } catch {
        setAccounts([]);
        setError('Failed to load connected accounts.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const handleUnlink = async (accountId: string) => {
    setUnlinkingId(accountId);

    try {
      await api.delete('/trading-accounts/unlink', {
        data: { accountId },
      });
      setAccounts((current) => current.filter((account) => account.id !== accountId));
    } catch {
      setError('Failed to unlink account.');
    } finally {
      setUnlinkingId(null);
    }
  };

  const onlineAccounts = useMemo(() => accounts.filter((account) => account.status === 'online'), [accounts]);
  const staleAccounts = useMemo(() => accounts.filter((account) => account.status === 'stale'), [accounts]);
  const mt4Count = useMemo(() => accounts.filter((account) => account.platform === 'MT4').length, [accounts]);
  const mt5Count = useMemo(() => accounts.filter((account) => account.platform === 'MT5').length, [accounts]);

  const connectionSummary = useMemo(() => {
    if (staleAccounts.length > 0) {
      return staleAccounts.length === 1 ? 'One stale feed' : `${staleAccounts.length} stale feeds`;
    }

    const offlineCount = accounts.filter((account) => account.status === 'offline').length;
    if (offlineCount > 0) {
      return offlineCount === 1 ? 'One offline feed' : `${offlineCount} offline feeds`;
    }

    return accounts.length > 0 ? 'All feeds healthy' : 'No connected feeds';
  }, [accounts, staleAccounts.length]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Account linking</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Connect brokerage accounts and watch live heartbeat state.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            This page now reflects actual heartbeat and account status data from the backend instead of placeholder rows.
          </p>
        </div>
        <Button className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Link new account
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Connected accounts</div>
            <div className="mt-3 text-3xl font-semibold text-white">{accounts.length}</div>
            <p className="mt-2 text-sm text-slate-400">
              {onlineAccounts.length} account{onlineAccounts.length === 1 ? '' : 's'} are feeding healthy heartbeats right now.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Platform mix</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-white">
              <WalletCards className="h-5 w-5 text-[#f4c77d]" />
              {mt4Count} MT4 / {mt5Count} MT5
            </div>
            <p className="mt-2 text-sm text-slate-400">Version visibility matters when debugging deployment issues.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/8 bg-white/[0.03]">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Connection state</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-white">
              <Activity className="h-5 w-5 text-[#8cc9c2]" />
              {connectionSummary}
            </div>
            <p className="mt-2 text-sm text-slate-400">Review delayed heartbeat accounts before they drift out of sync.</p>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <Card className="rounded-[30px] border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-6 text-sm text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-3">
        {isLoading ? (
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03] xl:col-span-3">
            <CardContent className="p-8 text-sm text-slate-400">Loading connected accounts...</CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03] xl:col-span-3">
            <CardContent className="p-8 text-sm text-slate-400">No connected trading accounts found.</CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className="rounded-[30px] border-white/8 bg-white/[0.03]">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl text-white">{account.accountNumber}</CardTitle>
                    <p className="mt-2 text-sm text-slate-400">
                      {account.brokerName} - {account.platform}
                    </p>
                  </div>
                  <Badge className={statusClass(account.status)}>{statusLabel(account.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Last heartbeat</div>
                  <div className="mt-2 text-sm font-semibold text-white">{formatRelativeTime(account.lastHeartbeat)}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Equity</div>
                  <div className="mt-2 text-sm font-semibold text-white">{formatCurrency(account.equity)}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Strategy</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {account.strategy.name} v{account.strategy.version}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10"
                  onClick={() => handleUnlink(account.id)}
                  disabled={unlinkingId === account.id}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  {unlinkingId === account.id ? 'Unlinking...' : 'Unlink account'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
