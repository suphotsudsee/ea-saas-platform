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
      'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20 hover:from-blue-500 hover:to-indigo-500',
    secondary: 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700',
    ghost: 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
    outline: 'border border-blue-500/50 text-blue-400 hover:bg-blue-500/10',
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function HomePage({ navigateTo }: { navigateTo: (page: PageId) => void }) {
  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-slate-800/50 pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.08),transparent_50%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[16%] h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-blue-600/18 blur-[150px]" />

        <div className="container relative z-10 mx-auto max-w-[900px] px-6 text-center">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
            <Activity size={14} />
            <span>Built for live account control</span>
          </div>

          <h1 className="mb-8 text-5xl font-extrabold leading-[0.92] tracking-tight text-white md:text-[6.2rem]">
            MT4 and MT5 <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              operations layer
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-[720px] text-lg leading-relaxed text-slate-400 md:text-[1rem] md:leading-[1.65]">
            Control licensing, risk, and live EA operations from one surface. Built for teams selling or operating
            Expert Advisors at scale. Replace spreadsheet ops, fragile scripts, and manual account handling with one
            system that is readable under pressure.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={() => navigateTo('pricing')} className="w-full rounded-xl px-14 py-3.5 text-base sm:w-auto">
              Start free trial <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              onClick={() => navigateTo('workflow')}
              variant="secondary"
              className="w-full rounded-xl bg-slate-800/85 px-12 py-3.5 text-base sm:w-auto"
            >
              See platform flow
            </Button>
          </div>

          <p className="mt-5 text-sm text-slate-500">No credit card required • 14-day trial</p>
        </div>
      </section>

      <section className="relative z-10 border-y border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 gap-8 divide-x divide-slate-800/0 md:grid-cols-4 md:divide-slate-800">
            {[
              { label: 'Active traders', value: '12,000+' },
              { label: 'Uptime target', value: '99.9%' },
              { label: 'Trades monitored', value: '150M+' },
              { label: 'Markets served', value: '50+' },
            ].map((stat) => (
              <div key={stat.label} className="px-4 text-center">
                <div className="mb-1 text-3xl font-bold text-white md:text-4xl">{stat.value}</div>
                <div className="text-sm font-medium text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Professional strategy desk</h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              A command center designed for rapid readability when market conditions change.
            </p>
          </div>

          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full border border-red-500/50 bg-red-500/20" />
                <div className="h-3 w-3 rounded-full border border-yellow-500/50 bg-yellow-500/20" />
                <div className="h-3 w-3 rounded-full border border-green-500/50 bg-green-500/20" />
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-slate-400">
                <Globe size={14} />
                Live Environment
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3 md:p-10">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-slate-300">License state</h3>
                  <Shield size={18} className="text-emerald-400" />
                </div>
                <div className="mb-2 text-4xl font-bold text-white">247</div>
                <p className="flex items-center gap-1 text-sm text-emerald-400">
                  <CheckCircle size={14} />
                  Active accounts (98.4% healthy)
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-slate-300">Risk actions</h3>
                  <AlertTriangle size={18} className="text-yellow-400" />
                </div>
                <div className="mb-2 text-4xl font-bold text-white">14</div>
                <p className="flex items-center gap-1 text-sm text-yellow-400">
                  <Zap size={14} />
                  Auto interventions today
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-slate-300">Strategy</h3>
                  <Terminal size={18} className="text-blue-400" />
                </div>
                <div className="mb-1 text-lg font-bold text-white">EA Momentum XAU</div>
                <p className="mb-4 font-mono text-sm text-slate-400">v2.3.1</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Heartbeat</span>
                    <span className="text-emerald-400">Streaming</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Exposure Rule</span>
                    <span className="text-white">3.5% Max</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeaturesPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            Designed for operators, <br />
            <span className="text-blue-400">not just marketers.</span>
          </h1>
          <p className="text-lg text-slate-400">
            Every section is tuned around the repetitive work involved in selling, protecting, and maintaining live
            Expert Advisor deployments.
          </p>
        </div>

        <div className="mx-auto mb-24 grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <RefreshCw size={24} className="text-blue-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Less manual account work</h3>
            <p className="leading-relaxed text-slate-400">
              Support and ops stop handling renewals, account bindings, and emergency actions through chat and
              spreadsheets. Automate the lifecycle.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
              <Shield size={24} className="text-red-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Faster responses under stress</h3>
            <p className="leading-relaxed text-slate-400">
              When market conditions deteriorate, risk actions are visible, structured, and immediate instead of
              improvised.
            </p>
          </div>
        </div>

        <h2 className="mb-12 text-center text-3xl font-bold text-white">Platform Capabilities</h2>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: Lock,
              title: 'License control built for live accounts',
              desc: 'Issue, revoke, and bind EA licenses to specific trading accounts without patching builds or sending manual keys.',
            },
            {
              icon: AlertTriangle,
              title: 'Risk automation, not just monitoring',
              desc: 'Define hard drawdown rules, kill switches, and session filters so protection happens automatically.',
            },
            {
              icon: BarChart3,
              title: 'Readable performance analytics',
              desc: 'Track P&L, drawdown, trade behavior, and account health in one place without juggling broker exports.',
            },
            {
              icon: Zap,
              title: 'Live sync back to the EA',
              desc: 'Push updated parameters, enable or disable protections, and keep connected terminals aligned without restarts.',
            },
            {
              icon: Server,
              title: 'Commercial operations included',
              desc: 'Support trials, subscriptions, and renewals with billing workflows tied directly to license provisioning.',
            },
            {
              icon: Layers,
              title: 'Operationally clean for teams',
              desc: 'Give support, product, and ops teams one dashboard for customer access, account state, and emergency actions.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 transition-colors hover:bg-slate-800/40"
            >
              <feature.icon size={24} className="mb-4 text-cyan-400" />
              <h4 className="mb-2 text-lg font-semibold text-white">{feature.title}</h4>
              <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">A three-step operating loop.</h1>
          <p className="text-lg text-slate-400">
            The platform is built to shorten the gap between commercial access, technical deployment, and daily
            operational control.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="absolute left-0 top-1/2 z-0 hidden h-0.5 w-full -translate-y-1/2 bg-slate-800 md:block" />

          <div className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Connect your commercial model',
                desc: 'Create plans, issue trial access, and decide how each strategy should be licensed.',
                icon: Settings,
              },
              {
                step: '02',
                title: 'Deploy the EA with platform hooks',
                desc: 'Use the included integration flow for heartbeats, license checks, config sync, and kill switch control.',
                icon: Cpu,
              },
              {
                step: '03',
                title: 'Operate from one command surface',
                desc: 'Monitor account health, manage risk actions, and update strategy settings without touching each terminal manually.',
                icon: Activity,
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
                <div className="absolute left-8 top-[-2rem] flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-950 shadow-lg shadow-black/50">
                  <span className="bg-gradient-to-b from-white to-slate-500 bg-clip-text text-xl font-bold text-transparent">
                    {item.step}
                  </span>
                </div>
                <div className="mt-6">
                  <item.icon size={28} className="mb-5 text-blue-500" />
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

function PricingPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">Straightforward plans with room to scale.</h1>
          <p className="text-lg text-slate-400">
            Start with a compact operational setup, then move into higher-account workflows as your client base and
            strategy catalog grow.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 transition-colors hover:border-slate-700">
            <h3 className="mb-2 text-xl font-bold text-white">Starter</h3>
            <p className="h-10 text-sm text-slate-400">For solo operators validating a single strategy.</p>
            <div className="my-6">
              <span className="text-4xl font-bold text-white">$29</span>
              <span className="text-slate-500">/ month</span>
            </div>
            <ul className="mb-8 space-y-4 text-sm text-slate-300">
              {['1 strategy', '3 accounts', 'Core licensing', 'Daily analytics', 'Email support'].map((item, index) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle size={16} className={index === 4 ? 'text-slate-600' : 'text-blue-500'} />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="w-full">
              Start free trial
            </Button>
          </div>

          <div className="relative rounded-2xl border border-blue-500/50 bg-gradient-to-b from-blue-900/40 to-slate-900 p-8 shadow-2xl shadow-blue-900/20 md:-translate-y-4">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Popular
              </span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Professional</h3>
            <p className="h-10 text-sm text-slate-400">For active desks running live distribution and tighter controls.</p>
            <div className="my-6">
              <span className="text-4xl font-bold text-white">$79</span>
              <span className="text-slate-500">/ month</span>
            </div>
            <ul className="mb-8 space-y-4 text-sm font-medium text-white">
              {['5 strategies', '10 accounts', 'Advanced risk rules', 'Live config sync', 'Priority support'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full">Start free trial</Button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 transition-colors hover:border-slate-700">
            <h3 className="mb-2 text-xl font-bold text-white">Enterprise</h3>
            <p className="h-10 text-sm text-slate-400">For teams managing multi-client operations at scale.</p>
            <div className="my-6">
              <span className="text-4xl font-bold text-white">$199</span>
              <span className="text-slate-500">/ month</span>
            </div>
            <ul className="mb-8 space-y-4 text-sm text-slate-300">
              {['Unlimited strategies', 'Unlimited accounts', 'Custom workflows', 'Audit visibility', 'Dedicated onboarding'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-blue-500" />
                    {item}
                  </li>
                ),
              )}
            </ul>
            <Button variant="secondary" className="w-full">
              Start free trial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      setError('Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in flex min-h-[80vh] items-center justify-center p-6 duration-500">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigateTo('home')}>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
              EA
            </div>
          </div>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          {mode === 'login' ? 'Welcome back' : 'Start your free trial'}
        </h2>
        <p className="mb-8 text-center text-sm text-slate-400">
          {mode === 'login' ? 'Enter your details to access your dashboard' : '14-day free trial. No credit card required.'}
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {mode === 'login' && (
            <div className="flex justify-end">
              <a href="#" className="text-sm text-blue-400 hover:text-blue-300">
                Forgot password?
              </a>
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <Button className="mt-2 w-full py-3">
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => navigateTo('register')} className="text-blue-400 hover:underline">
                Start free trial
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => navigateTo('login')} className="text-blue-400 hover:underline">
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
    { id: 'home', label: 'Platform' },
    { id: 'features', label: 'Features' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'border-b border-slate-800/50 bg-[#050b1b]/85 py-3 backdrop-blur-md' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex cursor-pointer items-center gap-2.5" onClick={() => navigateTo('home')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
            EA
          </div>
          <span className="text-[1.15rem] font-bold tracking-tight text-white">SaaS</span>
        </div>

        <div className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              className={`text-sm font-medium transition-colors ${
                currentPage === link.id ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Button variant="ghost" onClick={() => navigateTo('login')} className="px-4 text-sm font-semibold">
            Log in
          </Button>
          <Button onClick={() => navigateTo('register')} className="rounded-xl px-7 py-3 text-sm font-semibold">
            Start free trial
          </Button>
        </div>

        <button className="text-slate-300 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 top-full flex w-full flex-col gap-4 border-b border-slate-800 bg-slate-900 p-6 shadow-2xl md:hidden">
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
            Log in
          </button>
          <Button onClick={() => navigateTo('register')} className="mt-2 w-full rounded-xl">
            Start free trial
          </Button>
        </div>
      )}
    </nav>
  );
}

function Footer({ navigateTo }: { navigateTo: (page: PageId) => void }) {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-950 pb-8 pt-16">
      <div className="container mx-auto px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                EA
              </div>
              <span className="text-lg font-bold tracking-tight text-white">SaaS</span>
            </div>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              Licensing, risk control, and operational visibility for Expert Advisor teams that need more than a simple
              dashboard.
            </p>
            <div className="flex gap-2">
              {['Next.js', 'Prisma', 'MySQL', 'Redis'].map((item) => (
                <span
                  key={item}
                  className="rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-500"
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
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('workflow')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Workflow
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('pricing')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Access</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigateTo('login')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Log in
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('register')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Start free trial
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">© 2026 EA SaaS Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#030817] font-sans text-slate-200 selection:bg-blue-500/30">
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
