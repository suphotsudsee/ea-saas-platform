'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Shield,
  Zap,
  BarChart3,
  Layers,
  Terminal,
  CheckCircle,
  Server,
  Globe,
  ArrowRight,
  Menu,
  X,
  Settings,
  AlertTriangle,
  Lock,
  RefreshCw,
  Cpu,
  ChevronDown,
  Waves,
  TrendingUp,
  Smartphone,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

type PageId = 'home' | 'features' | 'workflow' | 'pricing' | 'login' | 'register';

function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  className?: string;
  onClick?: () => void;
}) {
  const baseStyle =
    'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200';
  const variants = {
    primary:
      'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500 font-bold',
    secondary: 'border border-amber-900/50 bg-amber-950/30 text-amber-200 hover:bg-amber-900/30',
    ghost: 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
    outline: 'border border-amber-500/50 text-amber-400 hover:bg-amber-500/10',
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

/* ─── Section 1: Hero ──────────────────────────────────────────────────── */
function HomePage({ navigateTo }: { navigateTo: (page: PageId) => void }) {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero */}
      <section className="relative min-h-[92vh] overflow-hidden border-b border-amber-900/20 pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_50%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[16%] h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[150px]" />

        <div className="container relative z-10 mx-auto max-w-[900px] px-6 text-center">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
            <Waves size={14} />
            <span>AI Gold Trading Bot — Version 12</span>
          </div>

          <h1 className="mb-8 text-5xl font-extrabold leading-[0.92] tracking-tight text-white md:text-[6.2rem]">
            AI TradingGold
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Automated
            </span>
          </h1>

          <p className="mx-auto mb-4 text-2xl font-semibold text-amber-200 md:text-3xl">
            Close profits in 3 waves — no need to watch the screen
          </p>

          <p className="mx-auto mb-12 max-w-[720px] text-lg leading-relaxed text-slate-400 md:text-[1rem] md:leading-[1.65]">
            3-Wave Cashout + 6 Smart Money Filters + Time Filter on MT5 — 1-month free trial, no upfront payment
            <br />
            Control from Dashboard — stop EA from your phone, anytime, anywhere
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={() => navigateTo('pricing')} className="w-full rounded-xl px-14 py-3.5 text-base sm:w-auto">
              Get Started 990$/month <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              onClick={() => navigateTo('features')}
              variant="secondary"
              className="w-full rounded-xl px-12 py-3.5 text-base sm:w-auto"
            >
              See How It Works
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> MT5</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> XAUUSD</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> 24/5</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> SaaS Dashboard</span>
          </div>
          <p className="mt-3 text-sm text-amber-500/70">⭐ 1-month free trial — no upfront payment</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 gap-8 divide-x divide-amber-900/0 md:grid-cols-4 md:divide-amber-900/30">
            {[
              { label: '3-Wave Cashout', value: '✅' },
              { label: 'Smart Money Filters', value: '6' },
              { label: 'Uptime Target', value: '99.9%' },
              { label: 'Thai Support', value: '🇹🇭' },
            ].map((stat) => (
              <div key={stat.label} className="px-4 text-center">
                <div className="mb-1 text-3xl font-bold text-amber-400 md:text-4xl">{stat.value}</div>
                <div className="text-sm font-medium text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 2: Pain Points ──────────────────────────────────────── */}
      <BacktestPerformanceSection />

      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Have You Ever?</h2>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: '😰', text: 'Gold price up +$80 but waiting for full TP → price reverses → profit gone' },
              { emoji: '😫', text: 'Watching the screen for 8 hours, looked away for 5 minutes → missed the move' },
              { emoji: '😤', text: 'Set SL too tight → stop-hunted every time' },
              { emoji: '😞', text: 'Bought an EA, used it for 3 days → lost money → shelved it' },
              { emoji: '🤔', text: 'Not sure if the EA is running right now — profit or loss?' },
              { emoji: '😰', text: 'EA filters too aggressively → never opens any orders' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-red-900/30 bg-red-950/10 p-6 transition-colors hover:border-red-900/50">
                <div className="mb-3 text-2xl">{item.emoji}</div>
                <p className="text-sm leading-relaxed text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 3: 3-Wave Cashout Solution ─────────────────────────── */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/30 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              💡 Solved with <span className="text-amber-400">3-Wave Cashout</span> System
            </h2>
            <p className="text-slate-400">Close profits in 3 rounds — guaranteed partial profit, no need to wait for 100% TP</p>
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="absolute left-0 top-1/2 z-0 hidden h-0.5 w-full -translate-y-1/2 bg-amber-900/30 md:block" />

            <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: 'W1',
                  title: 'Wave 1 — LockFirst',
                  pct: '25% TP',
                  desc: 'Close 1/3 of lot at 25% of TP — first profit locked in, won\'t reverse to a loss',
                  color: 'from-green-600 to-green-500',
                  icon: CheckCircle,
                },
                {
                  step: 'W2',
                  title: 'Wave 2 — AddProfit',
                  pct: '50% TP',
                  desc: 'Close the next 1/3 at 50% of TP — profit adds up, last lot still running',
                  color: 'from-green-500 to-emerald-400',
                  icon: TrendingUp,
                },
                {
                  step: 'W3',
                  title: 'Wave 3 — Follow Trend',
                  pct: 'Trailing',
                  desc: 'Breakeven + Trailing Stop — follow the trend for unlimited profit if price continues',
                  color: 'from-emerald-400 to-amber-400',
                  icon: Waves,
                },
              ].map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-amber-900/30 bg-slate-900 p-8 shadow-xl">
                  <div className="absolute left-8 top-[-2rem] flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/50 bg-slate-950 shadow-lg shadow-black/50">
                    <span className={`bg-gradient-to-b ${item.color} bg-clip-text text-xl font-bold text-transparent`}>
                      {item.step}
                    </span>
                  </div>
                  <div className="mt-6">
                    <item.icon size={28} className="mb-5 text-amber-500" />
                    <h3 className="mb-2 text-xl font-bold text-white">{item.title}</h3>
                    <p className="mb-3 font-mono text-sm text-amber-400">{item.pct}</p>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-6 text-center">
              <p className="mb-2 text-lg font-bold text-red-400">❌ EA General</p>
              <p className="text-sm text-slate-400">Wait for 100% TP → Price reverses → Loss</p>
            </div>
            <div className="rounded-xl border border-green-900/30 bg-green-950/10 p-6 text-center">
              <p className="mb-2 text-lg font-bold text-green-400">✅ TradeCandle v12</p>
              <p className="text-sm text-slate-400">Close in 3 rounds → guaranteed partial profit</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Smart Money Filters ──────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              🔓 6 <span className="text-amber-400">Smart Money</span> Filters
            </h2>
            <p className="text-slate-400">
              Reads market structure like a professional trader, but works automatically every tick
              <br />
              Acts as a <strong className="text-amber-300">Bonus Score</strong> — no lagging signals
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '⚡', name: 'BOS', full: 'Break of Structure', score: '±1', desc: 'StructureBreak — PriceBreak ThroughPointHigh/Previous Low' },
              { icon: '🔄', name: 'CHoCH', full: 'Change of Character', score: '±2', desc: 'Trend change direction — from up to down or down to up' },
              { icon: '🧱', name: 'OB', full: 'Order Block', score: '±1', desc: 'Institutional entry zone — key price reversal point' },
              { icon: '📐', name: 'FVG', full: 'Fair Value Gap', score: '±1', desc: 'Price gaps where price moved too fast — often retraces to fill' },
              { icon: '💧', name: 'Liq Sweep', full: 'Liquidity Sweep', score: '±2', desc: 'Liquidity hunt (stop hunt) — price touches highs/lows then reverses' },
              { icon: '📦', name: 'S/D', full: 'Supply/Demand Zone', score: '±1', desc: 'Supply-demand zone — where institutional capital entered' },
            ].map((filter) => (
              <div key={filter.name} className="rounded-xl border border-amber-900/20 bg-slate-900/40 p-5 transition-colors hover:border-amber-900/40 hover:bg-slate-800/40">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{filter.icon}</span>
                    <span className="text-lg font-bold text-white">{filter.name}</span>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-400">
                    {filter.score}
                  </span>
                </div>
                <p className="mb-2 text-sm font-medium text-amber-300">{filter.full}</p>
                <p className="text-sm text-slate-400">{filter.desc}</p>
              </div>
            ))}
          </div>

          {/* Confluence Gate */}
          <div className="mx-auto mt-10 max-w-xl rounded-xl border border-amber-700/30 bg-amber-950/20 p-6 text-center">
            <p className="mb-2 text-lg font-bold text-amber-300">🚦 Confluence Gate</p>
            <p className="text-sm text-slate-400">
              Must have ≥2 filters confirming the same direction simultaneously + no opposing signals → then score is added
              <br />
              Weak filter signals don't override strong signals
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 5: SaaS Platform Features ───────────────────────────── */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/30 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              📱 Control from your phone, anytime, anywhere
            </h2>
            <p className="text-slate-400">SaaS Dashboard lets you see, control, and stop EA from anywhere</p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Lock, title: '🔑 License Key Instant Delivery', desc: 'Buy → get key → paste in MT5 → start trading', color: 'text-amber-400' },
              { icon: Activity, title: '💓 Heartbeat Monitoring', desc: 'Know immediately if your EA is still running — no need to open MT5', color: 'text-green-400' },
              { icon: BarChart3, title: '📊 Dashboard Real-time', desc: 'P&L, Win Rate, Drawdown — all accounts on one page', color: 'text-cyan-400' },
              { icon: AlertTriangle, title: '🛑 Kill Switch', desc: 'Stop EA instantly from your phone — no need to access VPS', color: 'text-red-400' },
              { icon: Shield, title: '🛡️ Risk Management', desc: 'DD limit, session filter, spread filter from the platform', color: 'text-yellow-400' },
              { icon: RefreshCw, title: '🔄 Auto Config Sync', desc: 'Update EA parameters from the website — no restart needed', color: 'text-purple-400' },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 transition-colors hover:bg-slate-800/40">
                <feature.icon size={24} className={`mb-4 ${feature.color}`} />
                <h4 className="mb-2 text-base font-semibold text-white">{feature.title}</h4>
                <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 6: Social Proof ─────────────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              ⭐ Gold traders talk about us
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { quote: '"Woke up, opened MT5, saw +$340 — didn\'t have to do anything"', name: 'Tu', role: 'Gold Trader — 5 years' },
              { quote: '"3-Wave is a game changer. Before this I used other EAs waiting for full TP, price reverses every time. Now I close Wave 1 and already have profit"', name: 'James', role: 'Swing Trader' },
              { quote: '"Dashboard is easy to read. I know right away if the EA is profitable or not — no need to open MT5 and check each account"', name: 'Boy', role: 'Full-time Trader' },
            ].map((review, i) => (
              <div key={i} className="rounded-2xl border border-amber-900/20 bg-slate-900/60 p-8">
                <p className="mb-6 text-sm leading-relaxed text-slate-300">{review.quote}</p>
                <div>
                  <p className="font-bold text-amber-300">{review.name}</p>
                  <p className="text-sm text-slate-500">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 7: Pricing ──────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/30 py-24" id="pricing-section">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">💰 Choose Your Plan</h2>
            <p className="text-slate-400">1-month free trial, no upfront payment — cancel anytime</p>
          </div>

          {/**<PricingCards navigateTo={navigateTo} />**/}
          <PricingPage embedded />
        </div>
      </section>

      {/* ─── Section 8: FAQ ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">❓ Frequently Asked Questions</h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {[
              { q: 'Do I need to watch the screen?', a: 'No need! The EA runs automatically 24/5. You can view performance from the dashboard' },
              { q: 'Which brokers are supported?', a: 'Any broker that supports MT5 (Exness, XM, IC Markets, etc.)' },
              { q: 'What is the minimum trading capital?', a: 'Recommended $500+ (0.01 lot) or $2,000+ (0.03 lot)' },
              { q: 'Is there a guarantee?', a: '1-month free trial — cancel if not satisfied, no charge + 30-day money back' },
              { q: 'Does the EA run on my computer or the cloud?', a: 'It runs on your own MT5 (VPS recommended). We provide the license + dashboard' },
              { q: 'How is this different from free EAs?', a: '3-Wave Cashout + Smart Money Filters + SaaS Dashboard + Thai Support' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-amber-900/20 bg-slate-900/40">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-base font-semibold text-white hover:text-amber-300">
                  {faq.q}
                  <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 9: Final CTA ────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-amber-900/20 bg-gradient-to-b from-amber-950/20 to-transparent py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            🔥 Ready to let AI Gold Trading work for you?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-slate-400">
            Get Started 990THB/month — 1-month free trial, no upfront payment — cancel anytime
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={() => navigateTo('register')} className="w-full rounded-xl px-14 py-3.5 text-base sm:w-auto">
              🚀 Get Started 1 monthFree <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button variant="secondary" className="w-full rounded-xl px-12 py-3.5 text-base sm:w-auto">
              💬 Contact Line OA
            </Button>
          </div>
          <p className="mt-5 text-sm text-amber-500/80">⏰ Sign up this month — get 20% off all plans!</p>
        </div>
      </section>
    </div>
  );
}

/* ─── Pricing Page (also used inline) ──────────────────────────────────── */
function PricingPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <section className={embedded ? '' : 'px-4 pb-24 pt-32 sm:px-6 lg:pt-36'}>
      {!embedded && (
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">
            Choose the plan that fits you
          </h1>
          <p className="text-base text-slate-400 md:text-lg">
            1-month free trial, pay via USDT and manage your license from the dashboard
          </p>
        </div>
      )}

    <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 md:grid-cols-3">
      {/* Starter */}
      <div className="rounded-2xl border border-amber-900/20 bg-slate-900 p-8 transition-colors hover:border-amber-900/40">
        <h3 className="mb-2 text-xl font-bold text-white">Starter</h3>
        <p className="h-10 text-sm text-slate-400">For Beginner Traders — 1 Account</p>
        <div className="my-6">
          <span className="text-4xl font-bold text-white">990$</span>
          <span className="text-slate-500">/ month</span>
        </div>
        <ul className="mb-8 space-y-4 text-sm text-slate-300">
          {['1 MT5 Accounts', 'SaaS Dashboard', '3-Wave Cashout', '6 Smart Money Filters', 'Time Filter', 'Email Support'].map((item, index) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle size={16} className={index === 3 ? 'text-slate-600' : 'text-amber-500'} />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="w-full" onClick={() => { window.location.href = '/register?packageId=pkg_starter'; }}>
          1-month Free Trial
        </Button>
      </div>

      {/* Pro ⭐ */}
      <div className="relative rounded-2xl border border-amber-500/50 bg-gradient-to-b from-amber-900/30 to-slate-900 p-8 shadow-2xl shadow-amber-900/20 md:-translate-y-4">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
            Most Popular
          </span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">Pro ⭐</h3>
        <p className="h-10 text-sm text-slate-400">For Serious Traders — 3 Accounts</p>
        <div className="my-6">
          <span className="text-4xl font-bold text-white">2,490$</span>
          <span className="text-slate-500">/ month</span>
        </div>
        <ul className="mb-8 space-y-4 text-sm font-medium text-white">
          {['3 MT5 Accounts', 'Dashboard + Kill Switch', '3-Wave Cashout', '6 PA/SMC Filters', 'Time Filter', 'Line Support'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle size={16} className="text-amber-400" />
              {item}
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={() => { window.location.href = '/register?packageId=pkg_pro'; }}>1-month Free Trial</Button>
      </div>

      {/* Elite */}
      <div className="rounded-2xl border border-amber-900/20 bg-slate-900 p-8 transition-colors hover:border-amber-900/40">
        <h3 className="mb-2 text-xl font-bold text-white">Elite</h3>
        <p className="h-10 text-sm text-slate-400">For Professionals — 5 Accounts + VIP</p>
        <div className="my-6">
          <span className="text-4xl font-bold text-white">4,990$</span>
          <span className="text-slate-500">/ month</span>
        </div>
        <ul className="mb-8 space-y-4 text-sm text-slate-300">
          {['5 MT5 Accounts', 'Everything in Pro', 'Custom EA Config', 'VIP Line + 1-on-1 Setup Call'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle size={16} className="text-amber-500" />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="w-full" onClick={() => { window.location.href = '/register?packageId=pkg_elite'; }}>
          1-month Free Trial
        </Button>
      </div>
    </div>
    </section>
  );
}

function BacktestPerformanceSection() {
  const metrics = [
    { label: 'Total Net Profit', value: '+$4,857.85', tone: 'text-emerald-300' },
    { label: 'Win Rate', value: '74.75%', tone: 'text-amber-300' },
    { label: 'Total Trades', value: '7,353', tone: 'text-white' },
    { label: 'Max Equity DD', value: '3.94%', tone: 'text-sky-300' },
    { label: 'Profit Factor', value: '1.23', tone: 'text-white' },
    { label: 'Sharpe Ratio', value: '8.35', tone: 'text-emerald-300' },
  ];

  const reportFacts = [
    ['Expert', 'trade_candle_v12'],
    ['Symbol', 'XAUUSD'],
    ['Timeframe', 'M5'],
    ['Period', '2025.04.01 - 2026.04.03'],
    ['Initial Deposit', '$10,000'],
    ['Broker', 'Exness-MT5Trial7'],
  ];

  return (
    <section className="relative z-10 border-y border-amber-900/20 bg-[#080d19] py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
            <BarChart3 size={14} />
            <span>Strategy Tester Report</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Backtest Performance — TradeCandle v12
          </h2>
          <p className="text-sm leading-relaxed text-slate-400 md:text-base">
            Report from MT5 Strategy Tester on XAUUSD M5, period April 1, 2025 to April 3, 2026
            Starting deposit $10,000 with fixed lot 0.03
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-amber-900/20 bg-slate-950/70 p-4 text-center">
              <div className={`text-2xl font-extrabold ${metric.tone}`}>{metric.value}</div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-2xl border border-amber-900/25 bg-slate-950/70 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-amber-900/20 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">Balance Graph</h3>
                <p className="text-xs text-slate-500">MT5 Strategy Tester export</p>
              </div>
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                +48.58%
              </div>
            </div>
            <div className="bg-white p-3">
              <img
                src="/backtests/trade-candle-v12-balance.png"
                alt="TradeCandle v12 balance graph from MT5 Strategy Tester"
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-900/25 bg-slate-950/70 p-6">
            <h3 className="mb-5 font-semibold text-white">Report Details</h3>
            <div className="space-y-3">
              {reportFacts.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-800/70 pb-3 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-medium text-slate-200">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-900/25 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-100/80">
              Backtesting results are for informational purposes only. Actual results may vary depending on broker, spread,
              slippage, VPS, and market conditions at the time.
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            ['/backtests/trade-candle-v12-histogram.png', 'Profit distribution histogram'],
            ['/backtests/trade-candle-v12-mfemae.png', 'MFE MAE analysis graph'],
            ['/backtests/trade-candle-v12-holding.png', 'Holding time graph'],
          ].map(([src, alt]) => (
            <div key={src} className="overflow-hidden rounded-xl border border-amber-900/20 bg-slate-950/70">
              <div className="bg-white p-2">
                <img src={src} alt={alt} className="h-auto w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features Page ────────────────────────────────────────────────────── */
function FeaturesPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            Why is <span className="text-amber-400">TradeCandle v12</span>
            <br />
            different from generic EAs
          </h1>
          <p className="text-lg text-slate-400">
            Every feature is designed to solve real problems faced by Gold traders
          </p>
        </div>

        <div className="mx-auto mb-24 grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-900/20 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <RefreshCw size={24} className="text-amber-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Profits won't disappear along the way</h3>
            <p className="leading-relaxed text-slate-400">
              3-Wave Cashout closes profits gradually in 3 rounds — no need to wait for 100% TP that may never come
              Wave 1 locks first profit, Wave 2 adds more, Wave 3 follows the trend
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/20 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Shield size={24} className="text-green-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Smart Money — No Lagging Signals</h3>
            <p className="leading-relaxed text-slate-400">
              6 PA/SMC Filters act as a Bonus Score, not a gate — no over-filtering problem
              Confluence Gate requires ≥2 filters confirming the same direction simultaneously to add score
            </p>
          </div>
        </div>

        <h2 className="mb-12 text-center text-3xl font-bold text-white">Platform Capabilities</h2>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: Lock,
              title: 'License Key Automation',
              desc: 'Buy → get key → paste in MT5 → start trading. Account auto-linked via Heartbeat',
            },
            {
              icon: AlertTriangle,
              title: 'Risk Management from Platform',
              desc: 'DD limit, session filter, spread filter — platform-level protection, not just from the EA',
            },
            {
              icon: BarChart3,
              title: 'Dashboard Real-time',
              desc: 'P&L, Win Rate, Drawdown, Trade History — all accounts on one page',
            },
            {
              icon: Zap,
              title: 'Kill Switch — Stop Instantly',
              desc: 'One tap from your phone and EA stops — no need to access VPS',
            },
            {
              icon: Server,
              title: 'Subscription + Billing Complete',
              desc: 'Pay via USDT (ERC-20), free trial, auto-renewal',
            },
            {
              icon: Layers,
              title: 'Thai Support — Fast Response',
              desc: 'Line OA answers all questions, Pro+ gets Line priority support',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-amber-900/10 bg-slate-900/40 p-6 transition-colors hover:bg-slate-800/40"
            >
              <feature.icon size={24} className="mb-4 text-amber-400" />
              <h4 className="mb-2 text-lg font-semibold text-white">{feature.title}</h4>
              <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Workflow Page ─────────────────────────────────────────────────────── */
function WorkflowPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            Get Started in <span className="text-amber-400">3 Steps</span>
          </h1>
          <p className="text-lg text-slate-400">From sign-up to automated trading in under 10 minutes</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="absolute left-0 top-1/2 z-0 hidden h-0.5 w-full -translate-y-1/2 bg-amber-900/30 md:block" />

          <div className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Sign Up + Get License Key',
                desc: 'Choose a Plan → Send USDT → Receive key instantly in Dashboard',
                icon: Settings,
              },
              {
                step: '02',
                title: 'Paste Key in MT5',
                desc: 'Download EA → Paste License Key → Link accounts automatically via Heartbeat',
                icon: Cpu,
              },
              {
                step: '03',
                title: 'Automated Trading + ViewPerformance',
                desc: 'EA Trading 24/5 — View performance from mobile. Stop instantly with Kill Switch',
                icon: Activity,
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl border border-amber-900/30 bg-slate-900 p-8 shadow-xl">
                <div className="absolute left-8 top-[-2rem] flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/50 bg-slate-950 shadow-lg shadow-black/50">
                  <span className="bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-xl font-bold text-transparent">
                    {item.step}
                  </span>
                </div>
                <div className="mt-6">
                  <item.icon size={28} className="mb-5 text-amber-500" />
                  <h3 className="mb-3 text-xl font-bold text-white">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Auth Page ─────────────────────────────────────────────────────────── */
function AuthPage({
  mode,
  navigateTo,
}: {
  mode: 'login' | 'register';
  navigateTo: (page: PageId) => void;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      window.location.href = '/register';
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError('InformationNoCorrect');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in flex min-h-[80vh] items-center justify-center p-6 duration-500">
      <div className="w-full max-w-md rounded-2xl border border-amber-900/30 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigateTo('home')}>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-yellow-600 font-bold text-black text-sm">
              TC
            </div>
          </div>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          {mode === 'login' ? 'Log In' : 'Get Started — Free Trial'}
        </h2>
        <p className="mb-8 text-center text-sm text-slate-400">
          {mode === 'login' ? 'Enter Email and Password' : '1-month Free Trial — No payment required upfront'}
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-amber-900/30 bg-slate-950 px-4 py-2.5 text-white transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-amber-900/30 bg-slate-950 px-4 py-2.5 text-white transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {mode === 'login' && (
            <div className="flex justify-end">
              <a href="#" className="text-sm text-amber-400 hover:text-amber-300">
                Forgot Password?
              </a>
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <Button className="mt-2 w-full py-3">
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => navigateTo('register')} className="text-amber-400 hover:underline">
                Free Trial
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => navigateTo('login')} className="text-amber-400 hover:underline">
                Log In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Navbar ────────────────────────────────────────────────────────────── */
function Navbar({
  navigateTo,
  currentPage,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: {
  navigateTo: (page: PageId) => void;
  currentPage: PageId;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: Array<{ id: PageId; label: string }> = [
    { id: 'home', label: 'Landing Page' },
    { id: 'features', label: 'Feature' },
    { id: 'workflow', label: 'How to Use' },
    { id: 'pricing', label: 'Price' },
  ];

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'border-b border-amber-900/20 bg-[#050b1b]/85 py-3 backdrop-blur-md' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex cursor-pointer items-center gap-2.5" onClick={() => navigateTo('home')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-yellow-600 text-sm font-bold text-black">
            TC
          </div>
          <span className="text-[1.15rem] font-bold tracking-tight text-white">
            Trade<span className="text-amber-400">Candle</span>
          </span>
        </div>

        <div className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              className={`text-sm font-medium transition-colors ${
                currentPage === link.id ? 'text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Button variant="ghost" onClick={() => navigateTo('login')} className="px-4 text-sm font-semibold">
            Log In
          </Button>
          <Button onClick={() => navigateTo('register')} className="rounded-xl px-7 py-3 text-sm font-semibold">
            Free Trial
          </Button>
        </div>

        <button className="text-slate-300 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 top-full flex w-full flex-col gap-4 border-b border-amber-900/20 bg-slate-900 p-6 shadow-2xl md:hidden">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              className="py-2 text-left text-lg font-medium text-slate-300 hover:text-white"
            >
              {link.label}
            </button>
          ))}
          <div className="my-2 h-px bg-slate-800" />
          <button onClick={() => navigateTo('login')} className="py-2 text-left text-lg font-medium text-slate-300">
            Log In
          </button>
          <Button onClick={() => navigateTo('register')} className="mt-2 w-full rounded-xl">
            Free Trial
          </Button>
        </div>
      )}
    </nav>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */
function Footer({ navigateTo }: { navigateTo: (page: PageId) => void }) {
  return (
    <footer className="border-t border-amber-900/20 bg-slate-950 pb-8 pt-16">
      <div className="container mx-auto px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-yellow-600 text-xs font-bold text-black">
                TC
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Trade<span className="text-amber-400">Candle</span>
              </span>
            </div>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              AI Gold Trading Bot — Close profit in 3 waves — 3-Wave Cashout + 6 Smart Money Filters On MT5
            </p>
            <div className="flex gap-2">
              {['MT5', 'XAUUSD', 'SaaS', 'Thai'].map((item) => (
                <span
                  key={item}
                  className="rounded border border-amber-900/30 bg-amber-950/20 px-2 py-1 font-mono text-xs text-amber-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Product</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigateTo('features')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Feature
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('workflow')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  How to Use
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('pricing')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Price
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigateTo('login')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Log In
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('register')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Free Trial
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-amber-900/20 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">© 2026 TradeCandle. All rights reserved.</p>
          <p className="text-xs text-slate-600">⚠️ Trading involves risk. Past performance does not guarantee future results.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── App Root ──────────────────────────────────────────────────────────── */
export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-slate-200 selection:bg-amber-500/30">
      <Navbar
        navigateTo={navigateTo}
        currentPage={currentPage}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="min-h-screen">
        {currentPage === 'home' && <HomePage navigateTo={navigateTo} />}
        {currentPage === 'features' && <FeaturesPage />}
        {currentPage === 'workflow' && <WorkflowPage />}
        {currentPage === 'pricing' && <PricingPage />}
        {currentPage === 'login' && <AuthPage mode="login" navigateTo={navigateTo} />}
        {currentPage === 'register' && <AuthPage mode="register" navigateTo={navigateTo} />}
      </main>

      <Footer navigateTo={navigateTo} />
    </div>
  );
}
