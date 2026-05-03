'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  FileCheck2,
  FolderOpen,
  Globe,
  KeyRound,
  Monitor,
  Settings,
  Shield,
  Terminal,
  Wrench,
} from 'lucide-react';
import api from '@/lib/api';

interface LicenseInfo {
  id: string;
  key: string;
  status: string;
}

async function fetchLicense(): Promise<LicenseInfo | null> {
  try {
    const res = await api.get('/licenses/list');
    const licenses = res.data.licenses ?? [];
    const active = licenses.find((l: LicenseInfo) => l.status === 'ACTIVE');
    return active ?? licenses[0] ?? null;
  } catch {
    return null;
  }
}

export default function DownloadPage() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLicense().then((l) => {
      setLicense(l);
      setLicenseLoading(false);
    });
  }, []);

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const steps = [
    {
      icon: <FolderOpen className="h-5 w-5" />,
      title: 'Step 1 — Install the EA File',
      desc: (
        <>
          Download{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">TradeCandle_EA_v12.ex5</code>{' '}
          and copy it to:
          <code className="mt-1 block rounded bg-white/10 px-2 py-1 text-xs break-all">
            C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[Hash]\MQL5\Experts\
          </code>
          Or open MetaTrader 5 → <strong>File → Open Data Folder</strong> → navigate to{' '}
          <strong>MQL5 → Experts</strong> → paste the file there.
        </>
      ),
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: 'Step 2 — Configure WebRequest',
      desc: (
        <>
          In MT5: <strong>Tools → Options → Expert Advisors</strong> →
          check ✅ <strong>Allow WebRequest for listed URL</strong> →
          add:{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">https://tradecandle.net</code>
        </>
      ),
    },
    {
      icon: <Monitor className="h-5 w-5" />,
      title: 'Step 3 — Attach EA to a Chart',
      desc: (
        <>
          In MT5: open a <strong>XAUUSDm (M5)</strong> chart →
          drag the EA from the Navigator (under Expert Advisors) onto the chart →
          fill in the parameters in the dialog that appears.
        </>
      ),
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'Step 4 — Enter Your License Key',
      desc: (
        <>
          <strong>License Key</strong>: paste your license key (shown below) →
          <strong>API Key</strong>: enter{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">ea_saas_v1</code> →
          <strong>Server URL</strong>:{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">https://tradecandle.net</code> →
          click OK, then enable ✅ <strong>Algo Trading</strong> on the toolbar.
        </>
      ),
    },
    {
      icon: <ArrowDownToLine className="h-5 w-5" />,
      title: 'Step 5 — Trades Auto-Report to Dashboard',
      desc: (
        <>
          Once running, <strong>every trade</strong> — opens, closes, TP hits, SL stops — is
          automatically reported back to <strong>tradecandle.net</strong>.
          View your real-time P&L, win rate, and full trade history on the{' '}
          <a href="/dashboard" className="underline decoration-amber-400/50 hover:decoration-amber-300">
            Dashboard
          </a>{' '}
          and{' '}
          <a href="/dashboard/trade-history" className="underline decoration-amber-400/50 hover:decoration-amber-300">
            Trade History
          </a> pages.
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero Section */}
      <section className="rounded-[32px] border border-amber-900/30 bg-[linear-gradient(135deg,#0f172a_0%,#17120d_100%)] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10">
            Download & Setup
          </Badge>
          <Badge variant="outline" className="border-amber-900/30 bg-white/[0.04] text-slate-300">
            MT5 XAUUSD
          </Badge>
        </div>

        <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Install TradeCandle EA on MetaTrader 5
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          Follow the steps below to get the AI Gold Trading Bot running on MT5 in under 5 minutes.
          Works with Exness, XM, IC Markets, and any broker that supports MT5.
        </p>
      </section>

      {/* Download + License Section */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Download Card */}
        <Card className="rounded-[30px] border-emerald-500/20 bg-[linear-gradient(135deg,#0a1a1a_0%,#0d1717_100%)] lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <ArrowDownToLine className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">TradeCandle EA v12</CardTitle>
                <p className="mt-1 text-xs text-slate-400">XAUUSD · M5 · 3-Wave Strategy</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">File Size</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-white">
                <FileCheck2 className="h-4 w-4 text-slate-400" />
                126 KB · .ex5
              </div>
            </div>

            <Button
              asChild
              className="w-full rounded-2xl bg-emerald-600 py-6 text-base font-semibold text-white hover:bg-emerald-500"
            >
              <a href="/downloads/TradeCandle_EA_v12.ex5" download>
                <ArrowDownToLine className="mr-2 h-5 w-5" />
                Download EA v12
              </a>
            </Button>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <Shield className="mb-1 h-3.5 w-3.5 inline" /> This is a compiled .ex5 file — works with all MT5 builds.
            </div>
          </CardContent>
        </Card>

        {/* License Key Card */}
        <Card className="rounded-[30px] border-amber-500/20 bg-[linear-gradient(135deg,#1a150a_0%,#17120d_100%)] lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Your License Key</CardTitle>
                <p className="mt-1 text-xs text-slate-400">Enter this when attaching the EA in MT5</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {licenseLoading ? (
              <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <div className="animate-pulse text-sm text-slate-500">Loading license key...</div>
              </div>
            ) : license ? (
              <>
                <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">License Key</div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-lg text-white">{license.key}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 rounded-full border border-white/10 p-0 hover:bg-white/[0.06] shrink-0"
                      onClick={() => copyKey(license.key)}
                    >
                      {copiedId === license.key ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Badge className={license.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}>
                      {license.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">API Key</div>
                    <div className="mt-2 font-mono text-sm text-white">ea_saas_v1</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Server URL</div>
                    <div className="mt-2 font-mono text-sm text-white">tradecandle.net</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-200">
                No license key yet —{' '}
                <a href="/dashboard/subscription" className="underline decoration-rose-400/50 hover:decoration-rose-300">
                  subscribe to a plan
                </a>{' '}
                first to receive your license key.
              </div>
            )}

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <Shield className="mb-1 h-3.5 w-3.5 inline" /> License key is valid for 1 MT5 account and requires monthly renewal.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Setup Steps */}
      <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112129] text-[#8cc9c2]">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Setup Guide</CardTitle>
              <p className="mt-1 text-sm text-slate-400">4 steps — takes less than 5 minutes</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-[28px] border border-white/8 bg-[#0c1720] p-6 transition-colors hover:border-amber-900/30"
            >
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#112129] text-[#8cc9c2]">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <div className="mt-2 text-sm leading-7 text-slate-400">{step.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="rounded-[30px] border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Always test on a <strong>Demo Account</strong> first — see profits and drawdowns without risking real money.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Set <strong>Leverage to 1:2000</strong> on Exness for optimal EA performance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>If the EA doesn&apos;t trade — verify that <strong>Allow WebRequest</strong> is configured and <strong>Algo Trading</strong> is green on the toolbar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Monitor your EA status on the{' '}
                    <a href="/dashboard/licenses" className="underline decoration-amber-400/50 hover:decoration-amber-300">
                      Licenses page
                    </a>{' '}
                    — heartbeats tell you whether the EA is actively running.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
