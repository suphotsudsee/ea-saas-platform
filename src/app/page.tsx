'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({ name, price, period, features, highlight, cta }: {
  name: string; price: string; period: string; features: string[]; highlight: boolean; cta: string;
}) {
  return (
    <div className={`relative rounded-2xl p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 ${
      highlight
        ? 'bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20 border-2 border-blue-500/50 shadow-2xl shadow-blue-500/20'
        : 'bg-slate-900/80 border border-slate-800 hover:border-slate-600'
    }`}>
      {highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
          Most Popular
        </div>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-extrabold text-white">{price}</span>
        <span className="text-slate-400 text-sm">/{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-green-400 mt-0.5">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link href="/register" className={`block text-center py-3 rounded-xl font-semibold transition-all ${
        highlight
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25'
          : 'bg-slate-800 hover:bg-slate-700 text-white'
      }`}>
        {cta}
      </Link>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">

      {/* ─── Navigation ─────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0a0e1a]/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold">E</div>
            <span className="text-xl font-bold">EA<span className="text-blue-400">SaaS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              Login
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 px-5 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/5 rounded-full blur-[150px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
            </span>
            <span className="text-sm text-blue-300">Now supporting MT4 & MT5 • v2.0 released</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Scale Your <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">EA Business</span>
            <br />With Precision
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            The all-in-one infrastructure for Expert Advisor licensing, real-time risk management,
            and performance analytics. Deploy, monitor, and monetize your trading strategies with
            enterprise-grade security.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/register" className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105">
              <span>Start Free Trial</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105">
              <span>Client Login</span>
            </Link>
          </div>
          <p className="text-sm text-slate-500">No credit card required • 14-day free trial • Cancel anytime</p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: 12000, suffix: '+', label: 'Active Traders' },
              { value: 99, suffix: '.9%', label: 'Uptime SLA' },
              { value: 150, suffix: 'M+', label: 'Trades Monitored' },
              { value: 50, suffix: '+', label: 'Countries' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Monetize EAs</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">From license management to real-time risk control — all in one platform built for the MQL ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🔐', title: 'Secure Licensing',
                desc: 'Cryptographic license keys with hardware binding (account number), multi-account support, and instant revocation. Support for trial, subscription, and perpetual licenses.',
                gradient: 'from-blue-600/20 to-blue-800/10',
                border: 'border-blue-500/20',
              },
              {
                icon: '📉', title: 'Real-time Risk Engine',
                desc: '7 configurable risk rules: max drawdown, position limits, spread filter, session filter, equity protection, consecutive loss stop, and daily loss limit.',
                gradient: 'from-red-600/20 to-red-800/10',
                border: 'border-red-500/20',
              },
              {
                icon: '📊', title: 'Advanced Analytics',
                desc: 'Real-time P&L tracking, equity curves, strategy performance comparison, drawdown analysis, and trade-by-trade reporting across all linked accounts.',
                gradient: 'from-green-600/20 to-green-800/10',
                border: 'border-green-500/20',
              },
              {
                icon: '🤖', title: 'MT4 & MT5 Native',
                desc: 'Production-ready EA starter code for both MetaTrader 4 and 5. License check, heartbeat, config sync, and kill switch — all built-in. Just add your strategy.',
                gradient: 'from-purple-600/20 to-purple-800/10',
                border: 'border-purple-500/20',
              },
              {
                icon: '⚡', title: 'Kill Switch',
                desc: 'Global or per-user emergency kill switch. Instantly halt all trading across your fleet. Admin-triggered or auto-triggered by risk rules.',
                gradient: 'from-orange-600/20 to-orange-800/10',
                border: 'border-orange-500/20',
              },
              {
                icon: '💰', title: 'Billing & Subscriptions',
                desc: 'Built-in subscription management with Stripe integration. Monthly, quarterly, and yearly billing cycles with automatic license provisioning and expiry.',
                gradient: 'from-cyan-600/20 to-cyan-800/10',
                border: 'border-cyan-500/20',
              },
              {
                icon: '🔄', title: 'Live Config Sync',
                desc: 'Push strategy parameter updates to all running EAs in real-time. Change lot sizes, SL/TP, risk rules — no EA restart needed. Heartbeat-driven sync.',
                gradient: 'from-yellow-600/20 to-yellow-800/10',
                border: 'border-yellow-500/20',
              },
              {
                icon: '🛡️', title: 'Enterprise Security',
                desc: 'HMAC-SHA256 request signing, JWT authentication, rate limiting, encrypted connections, audit logging for every admin action.',
                gradient: 'from-emerald-600/20 to-emerald-800/10',
                border: 'border-emerald-500/20',
              },
              {
                icon: '📈', title: 'Dashboard & Admin',
                desc: 'Real-time admin dashboard with platform KPIs, customer management, license oversight, risk monitoring, and one-click emergency controls.',
                gradient: 'from-indigo-600/20 to-indigo-800/10',
                border: 'border-indigo-500/20',
              },
            ].map((feature, i) => (
              <div key={i} className={`group relative rounded-2xl p-6 bg-gradient-to-br ${feature.gradient} border ${feature.border} hover:border-opacity-50 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1`}>
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Up and Running in
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"> 3 Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Sign Up & Subscribe',
                desc: 'Create your account, choose a plan, and get your API credentials instantly. No setup fees.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                step: '02',
                title: 'Deploy Your EA',
                desc: 'Use our starter code (MT4/MT5), enter your license key, and attach to any chart. That\'s it.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                step: '03',
                title: 'Monitor & Manage',
                desc: 'Track performance, configure risk rules, update strategy params — all from your dashboard.',
                color: 'from-cyan-500 to-cyan-600',
              },
            ].map((s, i) => (
              <div key={i} className="relative text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} text-2xl font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 text-slate-700 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Simple, Transparent
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Start free, scale as you grow. No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$29"
              period="month"
              cta="Start Free Trial"
              highlight={false}
              features={[
                '1 EA Strategy',
                '3 Trading Accounts',
                'Basic Risk Rules',
                'Daily Analytics',
                'Email Support',
                'MT4 Support',
              ]}
            />
            <PricingCard
              name="Professional"
              price="$79"
              period="month"
              cta="Start Free Trial"
              highlight={true}
              features={[
                '5 EA Strategies',
                '10 Trading Accounts',
                'Advanced Risk Engine (7 rules)',
                'Real-time Analytics + Export',
                'Config Sync (Live Push)',
                'MT4 & MT5 Support',
                'Priority Support',
                'Kill Switch Control',
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="$199"
              period="month"
              cta="Contact Sales"
              highlight={false}
              features={[
                'Unlimited Strategies',
                'Unlimited Accounts',
                'Full Risk Engine + Custom Rules',
                'White-label Dashboard',
                'Custom API Integrations',
                'MT4 & MT5 Support',
                'Dedicated Account Manager',
                'SLA Guarantee (99.9%)',
                'Audit Logs & Compliance',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Trusted by
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> Professional Traders</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Alex K.',
                role: 'Hedge Fund Manager',
                quote: 'EA SaaS cut our deployment time from weeks to hours. The risk engine alone has saved us from 3 major drawdown events this quarter.',
                avatar: '🧑‍💼',
              },
              {
                name: 'Sarah M.',
                role: 'Prop Firm Developer',
                quote: 'Managing 200+ accounts used to be a nightmare. Now I push config changes from the dashboard and every EA picks it up within minutes.',
                avatar: '👩‍💻',
              },
              {
                name: 'David R.',
                role: 'Independent Trader',
                quote: 'The kill switch gave me peace of mind. I sleep better knowing the risk engine will auto-halt if my equity drops below my threshold.',
                avatar: '👨‍🔬',
              },
            ].map((t, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg">{t.avatar}</div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-400">Built with modern infrastructure</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-50">
            {['Next.js', 'TypeScript', 'Prisma', 'MySQL', 'Redis', 'Docker', 'Nginx', 'Prometheus', 'Grafana'].map((tech, i) => (
              <div key={i} className="px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-slate-400 font-mono">
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Ready to Scale Your EA Business?
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            Join thousands of traders who trust EA SaaS to manage, monitor, and monetize their Expert Advisors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 hover:from-blue-400 hover:via-purple-400 hover:to-cyan-400 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all shadow-2xl shadow-purple-500/30 hover:scale-105">
              Start Your Free Trial
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
          <p className="text-xs text-slate-600 mt-4">Free 14-day trial • No credit card required • Full feature access</p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold">E</div>
              <span className="font-bold">EA<span className="text-blue-400">SaaS</span></span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Enterprise-grade EA licensing and risk management infrastructure.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="#features" className="hover:text-slate-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-slate-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">API Docs</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3">Support</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="#" className="hover:text-slate-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">MT4 Setup Guide</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">MT5 Setup Guide</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3">Legal</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">Refund Policy</a></li>
              <li><a href="#" className="hover:text-slate-400 transition-colors">DPA</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-slate-800/50 text-center text-xs text-slate-700">
          © 2026 EA SaaS Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}