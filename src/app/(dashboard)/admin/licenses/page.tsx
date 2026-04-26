'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api, { getApiErrorMessage } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

interface Strategy {
  id: string;
  name: string;
  version: string;
}

interface SubscriptionItem {
  id: string;
  status: string;
  currentPeriodEnd?: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  package: {
    name: string;
    maxAccounts: number;
  };
}

interface LicenseItem {
  id: string;
  key: string;
  status: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  strategy: {
    id: string;
    name: string;
    version: string;
  };
}

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'PAUSED') return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
}

function toDateTimeLocal(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    userId: '',
    subscriptionId: '',
    strategyId: '',
    maxAccounts: '1',
    expiresAt: toDateTimeLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const results = await Promise.allSettled([
      api.get('/admin/licenses'),
      api.get('/admin/users'),
      api.get('/admin/strategies'),
      api.get('/admin/subscriptions'),
    ]);

    const [licensesResult, usersResult, strategiesResult, subscriptionsResult] = results;

    setLicenses(licensesResult.status === 'fulfilled' ? licensesResult.value.data.licenses ?? [] : []);
    setUsers(usersResult.status === 'fulfilled' ? usersResult.value.data.users ?? [] : []);
    setStrategies(strategiesResult.status === 'fulfilled' ? strategiesResult.value.data.strategies ?? [] : []);
    setSubscriptions(subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value.data.subscriptions ?? [] : []);
  }

  const filteredSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => !form.userId || subscription.user.id === form.userId),
    [subscriptions, form.userId]
  );

  useEffect(() => {
    if (!form.userId || form.subscriptionId) return;
    if (filteredSubscriptions.length === 1) {
      setForm((current) => ({
        ...current,
        subscriptionId: filteredSubscriptions[0].id,
      }));
    }
  }, [filteredSubscriptions, form.subscriptionId, form.userId]);

  async function handleCreateLicense() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const payload = {
        userId: form.userId,
        subscriptionId: form.subscriptionId,
        strategyId: form.strategyId,
        maxAccounts: Number(form.maxAccounts || 1),
        expiresAt: new Date(form.expiresAt).toISOString(),
      };

      const response = await api.post('/licenses/create', payload);
      const created = response.data?.license;

      setMessage(created?.key ? `License created: ${created.key}` : 'License created successfully');
      setShowCreateForm(false);
      setForm({
        userId: '',
        subscriptionId: '',
        strategyId: '',
        maxAccounts: '1',
        expiresAt: toDateTimeLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      });
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create license'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Admin licensing</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Full control over the global license inventory.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            Extend, pause, revoke, or issue customer access without losing visibility into who owns which strategy.
          </p>
        </div>
        <Button
          className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]"
          onClick={() => {
            setShowCreateForm((value) => !value);
            setError(null);
            setMessage(null);
          }}
        >
          Issue manual license
        </Button>
      </section>

      {message && (
        <Card className="rounded-[24px] border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 text-sm text-emerald-300">{message}</CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card className="rounded-[30px] border-[#8cc9c2]/20 bg-[#10252a]/35">
          <CardHeader>
            <CardTitle className="text-xl text-white">Issue manual license</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">User</span>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  value={form.userId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      userId: event.target.value,
                      subscriptionId: '',
                    }))
                  }
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
                {form.userId && filteredSubscriptions.length === 0 ? (
                  <p className="text-xs text-amber-300">
                    This user has no subscription yet. Run the seed again or create a subscription first.
                  </p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Subscription</span>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  value={form.subscriptionId}
                  onChange={(event) => setForm((current) => ({ ...current, subscriptionId: event.target.value }))}
                >
                  <option value="">Select subscription</option>
                  {filteredSubscriptions.map((subscription) => (
                    <option key={subscription.id} value={subscription.id}>
                      {subscription.user.name || subscription.user.email} • {subscription.package.name} • {subscription.status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Strategy</span>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  value={form.strategyId}
                  onChange={(event) => setForm((current) => ({ ...current, strategyId: event.target.value }))}
                >
                  <option value="">Select strategy</option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name} v{strategy.version}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Max accounts</span>
                <Input
                  type="number"
                  min="1"
                  value={form.maxAccounts}
                  onChange={(event) => setForm((current) => ({ ...current, maxAccounts: event.target.value }))}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Expiry</span>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                />
              </label>
            </div>

            {error && <div className="text-sm text-rose-300">{error}</div>}

            <div className="flex gap-3">
              <Button
                className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]"
                onClick={handleCreateLicense}
                disabled={
                  saving ||
                  !form.userId ||
                  !form.subscriptionId ||
                  !form.strategyId ||
                  !form.expiresAt
                }
              >
                {saving ? 'Creating...' : 'Create license'}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {licenses.length === 0 && (
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardContent className="p-6 text-sm text-slate-400">No licenses found.</CardContent>
          </Card>
        )}

        {licenses.map((lic) => (
          <Card key={lic.id} className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr] lg:items-center">
              <div>
                <div className="text-sm font-semibold text-white">{lic.strategy.name}</div>
                <div className="mt-2 font-mono text-xs text-slate-500">{lic.key}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Customer</div>
                <div className="mt-2 text-sm font-medium text-white">{lic.user.name || lic.user.email}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Expiry</div>
                <div className="mt-2 text-sm font-medium text-white">{new Date(lic.expiresAt).toLocaleDateString('en-US')}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
                <Badge className={`mt-2 ${statusClass(lic.status)}`}>{lic.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
