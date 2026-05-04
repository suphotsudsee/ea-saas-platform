'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  FolderOpen,
  Globe,
  Info,
  KeyRound,
  Monitor,
  MousePointerClick,
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
      icon: <FileCheck2 className="h-5 w-5" />,
      title: 'Step 1 — Download the EA File',
      desc: (
        <div className="space-y-3">
          <p>
            Click the <strong className="text-emerald-300">Download EA v12</strong> button above
            to get the file <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">TradeCandle_EA_v12.ex5</code>
          </p>
          <p>
            This is a <strong>.ex5</strong> (compiled) file — ready to use, no compilation needed.
            Compatible with all MT5 builds (2000+).
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            <Info className="mb-1 h-3.5 w-3.5 inline" />{' '}
            <strong>File size:</strong> ~126 KB — very lightweight.
          </div>
        </div>
      ),
    },
    {
      icon: <FolderOpen className="h-5 w-5" />,
      title: 'Step 2 — Place the EA in the MT5 Folder',
      desc: (
        <div className="space-y-3">
          <p><strong className="text-amber-300">Method 1 (Recommended):</strong> Inside MT5 menu</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Click <strong>File</strong> → <strong>Open Data Folder</strong></li>
            <li>A File Explorer window will open</li>
            <li>Navigate to <strong>MQL5</strong> → <strong>Experts</strong></li>
            <li>Paste the downloaded <code className="rounded bg-white/10 px-1 py-0.5 text-xs">TradeCandle_EA_v12.ex5</code> file here</li>
          </ol>
          <p className="text-xs text-slate-500">Or place it directly at:</p>
          <code className="block break-all rounded bg-white/5 px-3 py-2 text-xs text-slate-300">
            C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[FolderHash]\MQL5\Experts\
          </code>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-sky-200">
            <Info className="mb-1 h-3.5 w-3.5 inline" />{' '}
            <strong>Tip:</strong> If MT5 is already open — 
            <strong>right-click in the Navigator</strong> → <strong>Refresh</strong> 
            so MT5 detects the new EA file.
          </div>
        </div>
      ),
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: 'Step 3 — Configure WebRequest ⚠️ Critical!',
      desc: (
        <div className="space-y-3">
          <p>
            The EA must send trade data back to the server — 
            without this step, the EA <strong className="text-rose-300">will NOT work!</strong>
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>In MT5 → <strong>Tools</strong> → <strong>Options</strong> (or <kbd className="rounded border border-white/20 px-1 text-xs">Ctrl+O</kbd>)</li>
            <li>Go to the <strong>Expert Advisors</strong> tab</li>
            <li>
              Check ✅ <strong>&quot;Allow WebRequest for listed URL&quot;</strong>
            </li>
            <li>
              Click <strong>Add</strong> → type:{' '}
              <code className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-200">
                https://tradecandle.net
              </code>
            </li>
            <li>Click <strong>OK</strong> → <strong>OK</strong> again</li>
          </ol>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">
            <AlertTriangle className="mb-1 h-3.5 w-3.5 inline" />{' '}
            <strong>Warning:</strong> If you skip this step, the EA will show errors
            in the Experts tab (bottom of MT5) — it cannot report trade events to the Dashboard.
          </div>
        </div>
      ),
    },
    {
      icon: <Monitor className="h-5 w-5" />,
      title: 'Step 4 — Open an XAUUSD Chart',
      desc: (
        <div className="space-y-3">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              In MT5 → <strong>File</strong> → <strong>New Chart</strong> → <strong>XAUUSDm</strong> (or XAUUSD)
            </li>
            <li>Set the timeframe to <strong>M5</strong> (5-minute) — the EA is optimized for M5</li>
          </ol>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="mb-1 h-3.5 w-3.5 inline" />{' '}
            <strong>XAUUSDm</strong> = Gold on Exness Demo accounts (3-digit pricing) — 
            works directly with EA v12.
          </div>
        </div>
      ),
    },
    {
      icon: <MousePointerClick className="h-5 w-5" />,
      title: 'Step 5 — Attach the EA to the Chart',
      desc: (
        <div className="space-y-3">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Press <kbd className="rounded border border-white/20 px-1 text-xs">Ctrl+N</kbd> to open the <strong>Navigator</strong> panel</li>
            <li>In Navigator → <strong>Expert Advisors</strong> → find <strong>TradeCandle_EA_v12</strong></li>
            <li><strong>Drag the EA onto the XAUUSD chart</strong> — a configuration window will pop up</li>
            <li>Fill in the parameters in the <strong>Inputs</strong> tab:</li>
          </ol>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3 text-amber-400">Parameter</th>
                  <th className="py-2 text-amber-400">Value</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-3 font-semibold">
                    License Key
                  </td>
                  <td className="py-2">
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-200">
                      (Copy from the card below)
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-3">API Key</td>
                  <td className="py-2">
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">ea_saas_v1</code>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Server URL</td>
                  <td className="py-2">
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">https://tradecandle.net</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>Under the <strong>Common</strong> tab, make sure <strong>Allow Algo Trading</strong> is checked ✅</p>
          <p>Click <strong>OK</strong> to confirm.</p>
        </div>
      ),
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'Step 6 — Enable Algo Trading on the Toolbar',
      desc: (
        <div className="space-y-3">
          <p>
            <strong className="text-rose-300">Most important final step!</strong>{' '}
            After clicking OK, you must enable Algo Trading on the MT5 toolbar:
          </p>
          <p>
            Click the <strong>Algo Trading</strong> button 
            (🤖 robot/brain icon on the top toolbar) so it turns <strong className="text-emerald-300">GREEN</strong>.
          </p>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">
            <AlertTriangle className="mb-1 h-3.5 w-3.5 inline" />{' '}
            <strong>If the Algo Trading button is RED, the EA will NOT trade!</strong>
          </div>
        </div>
      ),
    },
    {
      icon: <CheckCircle2 className="h-5 w-5" />,
      title: 'Verification — Check That the EA Is Running',
      desc: (
        <div className="space-y-3">
          <p>Signs that the EA is working:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>On the XAUUSD chart — you'll see a <strong>😊 smiley face</strong> (or EA name) in the top-right corner</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>In the <strong>Experts</strong> tab (bottom panel) — you'll see 
                <code className="rounded bg-white/10 px-1 py-0.5 text-xs mx-1">License OK</code> 
                and <code className="rounded bg-white/10 px-1 py-0.5 text-xs">Heartbeat sent</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>Open your <strong>Dashboard</strong> → <strong>Licenses</strong> — 
                the license status should show{' '}
                <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 inline-flex h-5 text-[10px]">ACTIVE</Badge>{' '}
                and you'll see a recent heartbeat timestamp</span>
            </li>
          </ul>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            <Info className="mb-1 h-3.5 w-3.5 inline" />{' '}
            The EA takes 30–60 seconds to send its first heartbeat — 
            don't panic if you don't see it immediately.
          </div>
        </div>
      ),
    },
  ];

  const faqs = [
    {
      q: 'The EA won\'t trade — I see errors in the Experts tab',
      a: (
        <span>
          Check 3 things: (1) Is <strong>Allow WebRequest</strong> configured? (Step 3)
          (2) Is the <strong>Algo Trading</strong> button on the toolbar GREEN?
          (3) Is the License Key correct? — Try copying it again from this page.
        </span>
      ),
    },
    {
      q: 'How many MT5 accounts per License Key?',
      a: (
        <span>
          1 License Key = 1 MT5 Account — based on your package (Trial: 1, Starter: 1, Pro: 3, Elite: 5).
          Need more? Go to{' '}
          <a href="/dashboard/subscription" className="underline decoration-amber-400/50 hover:decoration-amber-300">
            Subscription
          </a>{' '}
          to upgrade.
        </span>
      ),
    },
    {
      q: 'Do I need to keep MT5 and my computer running?',
      a: (
        <span>
          <strong>Yes</strong> — the EA runs locally on your MT5 (client-side).
          You must keep MT5 open for the EA to trade.
          The Dashboard is for monitoring — it receives trade reports, it does not execute trades.
        </span>
      ),
    },
    {
      q: 'Can I run this on a VPS?',
      a: (
        <span>
          <strong>Yes!</strong> — The EA works on any Windows VPS.
          Install MT5 on the VPS → install the EA → follow the exact same steps.
          Recommended: Windows Server 2016+.
          This is the best way to trade 24/7 without keeping your personal computer on.
        </span>
      ),
    },
    {
      q: 'Switching MT5 accounts — do I need a new License Key?',
      a: (
        <span>
          <strong>No</strong> — the License Key is tied to your TradeCandle account.
          Go to{' '}
          <a href="/dashboard/licenses" className="underline decoration-amber-400/50 hover:decoration-amber-300">
            Licenses
          </a>{' '}
          → update the Account Number without creating a new subscription.
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* ───── Hero ───── */}
      <section className="rounded-[32px] border border-amber-900/30 bg-[linear-gradient(135deg,#0f172a_0%,#17120d_100%)] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10">
            Download & Setup
          </Badge>
          <Badge variant="outline" className="border-amber-900/30 bg-white/[0.04] text-slate-300">
            MT5 · XAUUSD
          </Badge>
          <Badge variant="outline" className="border-emerald-900/30 bg-emerald-500/10 text-emerald-300">
            EA v12
          </Badge>
        </div>

        <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Install TradeCandle EA on MetaTrader 5
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          Follow the steps below — <strong className="text-white">takes less than 5 minutes</strong> — 
          and your AI Gold Trading Bot will be running on MT5. 
          Works with Exness, XM, IC Markets, and any broker that supports MT5.
        </p>
      </section>

      {/* ───── Download + License Cards ───── */}
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
                126 KB · .ex5 (Compiled)
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
              <Shield className="mb-1 h-3.5 w-3.5 inline" />{' '}
              Pre-compiled .ex5 — ready to use, works with all MT5 builds.
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
                <p className="mt-1 text-xs text-slate-400">Paste this when attaching the EA in MT5 (Step 5)</p>
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
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    License Key
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-lg text-white">
                      {license.key}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 rounded-full border border-white/10 p-0 hover:bg-white/[0.06] shrink-0"
                      onClick={() => copyKey(license.key)}
                      title="Copy license key"
                    >
                      {copiedId === license.key ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Badge
                      className={
                        license.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }
                    >
                      {license.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      API Key
                    </div>
                    <div className="mt-2 font-mono text-sm text-white">ea_saas_v1</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Server URL
                    </div>
                    <div className="mt-2 font-mono text-sm text-white">tradecandle.net</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-200">
                No license key yet —{' '}
                <a
                  href="/dashboard/subscription"
                  className="underline decoration-rose-400/50 hover:decoration-rose-300"
                >
                  subscribe to a plan
                </a>{' '}
                first to receive your license key.
              </div>
            )}

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <Shield className="mb-1 h-3.5 w-3.5 inline" />{' '}
              1 License Key = 1 MT5 Account. Requires monthly renewal per package.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ───── 7-Step Installation Guide ───── */}
      <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112129] text-[#8cc9c2]">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Installation Guide — 7 Steps</CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Follow each step — takes less than 5 minutes
              </p>
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
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <div className="mt-3 text-sm leading-7 text-slate-400">{step.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ───── System Requirements ───── */}
      <Card className="rounded-[30px] border-sky-500/20 bg-sky-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">System Requirements</CardTitle>
              <p className="mt-1 text-sm text-slate-400">What you need before starting</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                🖥️ Operating System
              </div>
              <div className="mt-2 text-sm text-white">Windows 7 / 8 / 10 / 11 (64-bit)</div>
              <div className="mt-1 text-xs text-slate-500">Or Windows VPS</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                📊 MetaTrader 5
              </div>
              <div className="mt-2 text-sm text-white">Build 2000 or newer</div>
              <div className="mt-1 text-xs text-slate-500">
                <a href="https://www.metatrader5.com/en/download" target="_blank" rel="noopener noreferrer" className="underline decoration-sky-400/30 hover:decoration-sky-300">
                  Download MT5 <ExternalLink className="inline h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                🌐 Internet
              </div>
              <div className="mt-2 text-sm text-white">Always-on internet connection</div>
              <div className="mt-1 text-xs text-slate-500">Required for heartbeat & trade reporting</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                💰 Broker
              </div>
              <div className="mt-2 text-sm text-white">Exness, XM, IC Markets, etc.</div>
              <div className="mt-1 text-xs text-slate-500">
                Recommended: <strong>Exness</strong> — 1:2000 leverage, tight spreads
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ───── FAQ ───── */}
      <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Frequently Asked Questions</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Read before contacting support</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-[24px] border border-white/8 bg-[#0c1720] p-5"
            >
              <h4 className="font-semibold text-amber-300">{faq.q}</h4>
              <div className="mt-2 text-sm leading-7 text-slate-400">{faq.a}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ───── Pro Tips ───── */}
      <Card className="rounded-[30px] border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Pro Tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    <strong>Always test on a Demo Account first</strong> — 
                    see profits and drawdowns without risking real money.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    Set <strong>Leverage to 1:2000</strong> on Exness for optimal EA performance.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    Monitor your EA status on the{' '}
                    <a href="/dashboard/licenses" className="underline decoration-amber-400/50 hover:decoration-amber-300">
                      Licenses page
                    </a>{' '}
                    — heartbeats tell you whether the EA is actively running.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    If the EA doesn't trade — verify <strong>Allow WebRequest</strong> is configured
                    and <strong>Algo Trading</strong> is green on the toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    Want 24/7 trading? Use a <strong>Windows VPS</strong> — 
                    no need to keep your personal computer running.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
