'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface StrategyItem {
  id: string;
  name: string;
  description: string | null;
  version: string;
  isActive: boolean;
  _count?: {
    licenses: number;
  };
}

const defaultConfigTemplate = `{
  "lotSizingMethod": "risk_percent",
  "riskPercent": 1,
  "maxLot": 0.5
}`;

const riskConfigTemplate = `{
  "maxDrawdownPct": 15,
  "maxDailyLossPct": 3,
  "maxOpenPositions": 3
}`;

export default function AdminStrategiesPage() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
  const [deactivatingStrategyId, setDeactivatingStrategyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    version: '',
    defaultConfig: defaultConfigTemplate,
    riskConfig: riskConfigTemplate,
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    description: '',
    version: '',
    defaultConfig: defaultConfigTemplate,
    riskConfig: riskConfigTemplate,
    isActive: true,
  });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadStrategies();
  }, []);

  async function loadStrategies() {
    try {
      const res = await api.get('/admin/strategies');
      setStrategies(res.data.strategies ?? []);
    } catch {
      setStrategies([]);
    }
  }

  async function handleCreateStrategy() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const payload = {
        name: form.name,
        description: form.description || undefined,
        version: form.version,
        defaultConfig: JSON.parse(form.defaultConfig),
        riskConfig: JSON.parse(form.riskConfig),
        isActive: form.isActive,
      };

      await api.post('/admin/strategies', payload);

      setMessage(`Strategy '${form.name}' created successfully`);
      setForm({
        name: '',
        description: '',
        version: '',
        defaultConfig: defaultConfigTemplate,
        riskConfig: riskConfigTemplate,
        isActive: true,
      });
      setShowCreateForm(false);
      await loadStrategies();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create strategy');
    } finally {
      setSaving(false);
    }
  }

  function beginEditStrategy(strategy: StrategyItem & { defaultConfig?: unknown; riskConfig?: unknown }) {
    setShowCreateForm(false);
    setMessage(null);
    setError(null);
    setEditingStrategyId(strategy.id);
    setEditForm({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description || '',
      version: strategy.version,
      defaultConfig: JSON.stringify(strategy.defaultConfig ?? JSON.parse(defaultConfigTemplate), null, 2),
      riskConfig: JSON.stringify(strategy.riskConfig ?? JSON.parse(riskConfigTemplate), null, 2),
      isActive: strategy.isActive,
    });
  }

  async function handleUpdateStrategy() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const payload = {
        id: editForm.id,
        name: editForm.name,
        description: editForm.description || undefined,
        version: editForm.version,
        defaultConfig: JSON.parse(editForm.defaultConfig),
        riskConfig: JSON.parse(editForm.riskConfig),
        isActive: editForm.isActive,
        changeReason: 'Updated from admin strategies page',
      };

      await api.put('/admin/strategies', payload);
      setMessage(`Strategy '${editForm.name}' updated successfully`);
      setEditingStrategyId(null);
      await loadStrategies();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update strategy');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateStrategy(strategyId: string, strategyName: string) {
    try {
      setDeactivatingStrategyId(strategyId);
      setError(null);
      setMessage(null);
      await api.delete(`/admin/strategies?id=${strategyId}`);
      setMessage(`Strategy '${strategyName}' deactivated successfully`);
      if (editingStrategyId === strategyId) {
        setEditingStrategyId(null);
      }
      await loadStrategies();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to deactivate strategy');
    } finally {
      setDeactivatingStrategyId(null);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Strategy catalog</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Manage the real strategy inventory used by licenses and customers.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            This page is backed by the actual strategy table. Active state, version, and current license usage come from live records.
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
          Add strategy
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
            <CardTitle className="text-xl text-white">Create strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Name</span>
                <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Version</span>
                <Input value={form.version} onChange={(e) => setForm((current) => ({ ...current, version: e.target.value }))} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Description</span>
                <Input value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Default config JSON</span>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.defaultConfig}
                  onChange={(e) => setForm((current) => ({ ...current, defaultConfig: e.target.value }))}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Risk config JSON</span>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.riskConfig}
                  onChange={(e) => setForm((current) => ({ ...current, riskConfig: e.target.value }))}
                />
              </label>
            </div>

            {error && <div className="text-sm text-rose-300">{error}</div>}

            <div className="flex gap-3">
              <Button
                className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]"
                onClick={handleCreateStrategy}
                disabled={saving || !form.name || !form.version}
              >
                {saving ? 'Creating...' : 'Create strategy'}
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

      {editingStrategyId && (
        <Card className="rounded-[30px] border-[#e3a84f]/20 bg-[#241a0f]/35">
          <CardHeader>
            <CardTitle className="text-xl text-white">Edit strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Name</span>
                <Input value={editForm.name} onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Version</span>
                <Input value={editForm.version} onChange={(e) => setEditForm((current) => ({ ...current, version: e.target.value }))} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Description</span>
                <Input value={editForm.description} onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Default config JSON</span>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.defaultConfig}
                  onChange={(e) => setEditForm((current) => ({ ...current, defaultConfig: e.target.value }))}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Risk config JSON</span>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.riskConfig}
                  onChange={(e) => setEditForm((current) => ({ ...current, riskConfig: e.target.value }))}
                />
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]"
                onClick={handleUpdateStrategy}
                disabled={saving || !editForm.name || !editForm.version}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
                onClick={() => setEditingStrategyId(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-xl text-white">Strategies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {strategies.length === 0 && <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-6 text-sm text-slate-400">No strategies found.</div>}

          {strategies.map((strategy: StrategyItem & { defaultConfig?: unknown; riskConfig?: unknown }) => (
            <div key={strategy.id} className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]">
              <div>
                <div className="text-sm font-semibold text-white">{strategy.name}</div>
                <div className="mt-1 text-xs text-slate-500">{strategy.description || 'No description provided.'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Version</div>
                <div className="mt-2 text-sm font-medium text-white">{strategy.version}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
                <Badge className={`mt-2 ${strategy.isActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>
                  {strategy.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Licenses</div>
                <div className="mt-2 text-sm font-medium text-white">{strategy._count?.licenses ?? 0}</div>
              </div>
              <div className="flex items-start justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
                  onClick={() => beginEditStrategy(strategy)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                  onClick={() => handleDeactivateStrategy(strategy.id, strategy.name)}
                  disabled={!isSuperAdmin || deactivatingStrategyId === strategy.id}
                  title={isSuperAdmin ? 'Deactivate strategy' : 'Super admin required'}
                >
                  {deactivatingStrategyId === strategy.id ? 'Deactivating...' : 'Deactivate'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
