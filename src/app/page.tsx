'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  Menu,
  Radio,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1400;
    const steps = 40;
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

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8cc9c2]">
        {eyebrow}
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-[28px] border border-white/8 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#8cc9c2]/30 hover:bg-white/[0.05]">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10252a] text-[#8cc9c2]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  summary,
  features,
  featured = false,
}: {
  name: string;
  price: string;
  period: string;
  summary: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-[32px] border p-8 transition-all duration-300 ${
        featured
          ? 'border-[#e3a84f]/40 bg-[#16130d] shadow-[0_20px_80px_rgba(227,168,79,0.12)]'
          : 'border-white/8 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{name}</h3>
          <p className="mt-2 text-sm text-slate-400">{summary}</p>
        </div>
        {featured && (
          <span className="rounded-full border border-[#e3a84f]/30 bg-[#e3a84f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#f4c77d]">
            Popular
          </span>
        )}
      </div>

      <div className="mt-8 flex items-end gap-2">
        <span className="text-5xl font-semibold tracking-tight text-white">{price}</span>
        <span className="pb-1 text-sm text-slate-500">/ {period}</span>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
            <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-[#8cc9c2]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/register"
        className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
          featured
            ? 'bg-[#e3a84f] text-[#14110c] hover:bg-[#efb65d]'
            : 'bg-white/8 text-white hover:bg-white/12'
        }`}
      >
        Start free trial
      </Link>
    </div>
  );
}

const features = [
  {
    icon: LockKeyhole,
    title: 'License control built for live accounts',
    description:
      'Issue, revoke, and bind EA licenses to specific trading accounts without patching builds or sending manual keys.',
  },
  {
    icon: ShieldAlert,
    title: 'Risk automation, not just monitoring',
    description:
      'Define hard drawdown rules, kill switches, and session filters so protection happens automatically when market conditions change.',
  },
  {
    icon: BarChart3,
    title: 'Readable performance analytics',
    description:
      'Track P&L, drawdown, trade behavior, and account health in one place without juggling broker exports and spreadsheets.',
  },
  {
    icon: Radio,
    title: 'Live sync back to the EA',
    description:
      'Push updated parameters, enable or disable protections, and keep connected terminals aligned without manual restarts.',
  },
  {
    icon: CreditCard,
    title: 'Commercial operations included',
    description:
      'Support trials, subscriptions, and renewals with billing workflows tied directly to license provisioning.',
  },
  {
    icon: Sparkles,
    title: 'Operationally clean for teams',
    description:
      'Give support, product, and ops teams one dashboard for customer access, account state, and emergency actions.',
  },
];

const steps = [
  {
    id: '01',
    title: 'Connect your commercial model',
    description: 'Create plans, issue trial access, and decide how each strategy should be licensed.',
  },
  {
    id: '02',
    title: 'Deploy the EA with platform hooks',
    description: 'Use the included integration flow for heartbeats, license checks, config sync, and kill switch control.',
  },
  {
    id: '03',
    title: 'Operate from one command surface',
    description: 'Monitor account health, manage risk actions, and update strategy settings without touching each terminal manually.',
  },
];

const pricing = [
  {
    name: 'Starter',
    price: '$29',
    period: 'month',
    summary: 'For solo operators validating a single strategy.',
    features: ['1 strategy', '3 accounts', 'Core licensing', 'Daily analytics', 'Email support'],
  },
  {
    name: 'Professional',
    price: '$79',
    period: 'month',
    summary: 'For active desks running live distribution and tighter controls.',
    features: ['5 strategies', '10 accounts', 'Advanced risk rules', 'Live config sync', 'Priority support'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: 'month',
    summary: 'For teams managing multi-client operations at scale.',
    features: ['Unlimited strategies', 'Unlimited accounts', 'Custom workflows', 'Audit visibility', 'Dedicated onboarding'],
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#081118] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(140,201,194,0.2),rgba(8,17,24,0)_68%)]" />
        <div className="absolute right-[-120px] top-[160px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(227,168,79,0.12),rgba(8,17,24,0)_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.14]" />
      </div>

      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b border-white/8 bg-[#081118]/85 backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8cc9c2] text-sm font-bold text-[#081118]">
              EA
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-slate-400">PLATFORM</div>
              <div className="text-base font-semibold text-white">EA SaaS</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#workflow" className="transition-colors hover:text-white">
              Workflow
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full bg-[#e3a84f] px-5 py-2.5 text-sm font-semibold text-[#14110c] transition-colors hover:bg-[#efb65d]"
            >
              Start free trial
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/8 bg-[#081118]/95 px-5 py-4 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>
                Workflow
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[#e3a84f] px-5 py-3 font-semibold text-[#14110c]"
              >
                Start free trial
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="relative">
        <section className="px-5 pb-20 pt-28 sm:px-6 sm:pt-36">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#8cc9c2]/20 bg-[#8cc9c2]/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#9ddad3]">
                <Radio className="h-3.5 w-3.5" />
                MT4 and MT5 operations layer
              </div>

              <h1 className="mt-8 text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Control licensing, risk, and live EA operations from one surface.
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
                Built for teams selling or operating Expert Advisors at scale. Replace spreadsheet ops, fragile scripts,
                and manual account handling with one system that is readable under pressure.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e3a84f] px-7 py-4 text-base font-semibold text-[#14110c] transition-colors hover:bg-[#efb65d]"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/4 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/8"
                >
                  See platform flow
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
                <span>No credit card required</span>
                <span>14-day trial</span>
                <span>Built for live account control</span>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { value: 12000, suffix: '+', label: 'Active traders' },
                  { value: 99, suffix: '.9%', label: 'Uptime target' },
                  { value: 150, suffix: 'M+', label: 'Trades monitored' },
                  { value: 50, suffix: '+', label: 'Markets served' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-2xl font-semibold text-white">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(140,201,194,0.16),rgba(8,17,24,0)_70%)]" />
              <div className="relative rounded-[36px] border border-white/10 bg-[#0c1720]/90 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="rounded-[28px] border border-white/8 bg-[#081118] p-5">
                  <div className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Operations overview</div>
                      <div className="mt-1 text-lg font-semibold text-white">Professional strategy desk</div>
                    </div>
                    <div className="rounded-full bg-[#10252a] px-3 py-1 text-xs font-semibold text-[#8cc9c2]">Live</div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/8 bg-[#0f1b24] p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">License state</div>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <div className="text-3xl font-semibold text-white">247</div>
                          <div className="mt-1 text-sm text-slate-500">Active accounts</div>
                        </div>
                        <div className="rounded-full bg-[#163229] px-3 py-1 text-xs font-semibold text-[#8cc9c2]">98.4% healthy</div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-[#16130d] p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Risk actions</div>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <div className="text-3xl font-semibold text-white">14</div>
                          <div className="mt-1 text-sm text-slate-500">Auto interventions today</div>
                        </div>
                        <div className="rounded-full bg-[#2a2212] px-3 py-1 text-xs font-semibold text-[#f4c77d]">Guardrails on</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Strategy command surface</div>
                        <div className="mt-1 text-lg font-semibold text-white">EA Momentum XAU</div>
                      </div>
                      <div className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-slate-300">Version 2.3.1</div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {[
                        { label: 'Heartbeat status', value: 'Streaming normally', tone: 'text-[#8cc9c2]' },
                        { label: 'Last config push', value: '2 minutes ago', tone: 'text-white' },
                        { label: 'Exposure rule', value: '3.5% max risk per account', tone: 'text-white' },
                        { label: 'Emergency control', value: 'Fleet kill switch available', tone: 'text-[#f4c77d]' },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0c1720] px-4 py-3"
                        >
                          <span className="text-sm text-slate-500">{row.label}</span>
                          <span className={`text-sm font-medium ${row.tone}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 rounded-[36px] border border-white/8 bg-white/[0.03] p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Why teams switch</div>
              <div className="mt-3 text-2xl font-semibold text-white">A calmer operating model for EA businesses.</div>
            </div>
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-5">
              <div className="text-sm font-semibold text-white">Less manual account work</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Support and ops stop handling renewals, account bindings, and emergency actions through chat and spreadsheets.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-5">
              <div className="text-sm font-semibold text-white">Faster responses under stress</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                When market conditions deteriorate, risk actions are visible, structured, and immediate instead of improvised.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Platform capabilities"
              title="Designed for operators, not just marketers."
              description="Every section is tuned around the repetitive work involved in selling, protecting, and maintaining live Expert Advisor deployments."
            />

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Workflow"
              title="A three-step operating loop."
              description="The platform is built to shorten the gap between commercial access, technical deployment, and daily operational control."
            />

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.id} className="rounded-[32px] border border-white/8 bg-white/[0.03] p-8">
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8cc9c2]">{step.id}</div>
                  <h3 className="mt-6 text-2xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Pricing"
              title="Straightforward plans with room to scale."
              description="Start with a compact operational setup, then move into higher-account workflows as your client base and strategy catalog grow."
            />

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {pricing.map((plan) => (
                <PricingCard key={plan.name} {...plan} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[40px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-8 sm:p-12">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8cc9c2]">
                Final call
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                If you run EAs commercially, the operations layer matters as much as the strategy.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-400">
                Clean licensing, readable risk controls, and one reliable command surface make the business easier to grow and much easier to trust.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e3a84f] px-7 py-4 text-base font-semibold text-[#14110c] transition-colors hover:bg-[#efb65d]"
                >
                  Start your free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/8"
                >
                  Existing client login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-5 py-12 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8cc9c2] text-sm font-bold text-[#081118]">
                EA
              </div>
              <div className="text-lg font-semibold text-white">EA SaaS</div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              Licensing, risk control, and operational visibility for Expert Advisor teams that need more than a simple dashboard.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-white">Product</div>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <a href="#features" className="block transition-colors hover:text-slate-300">
                Features
              </a>
              <a href="#workflow" className="block transition-colors hover:text-slate-300">
                Workflow
              </a>
              <a href="#pricing" className="block transition-colors hover:text-slate-300">
                Pricing
              </a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white">Access</div>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <Link href="/login" className="block transition-colors hover:text-slate-300">
                Log in
              </Link>
              <Link href="/register" className="block transition-colors hover:text-slate-300">
                Start free trial
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white">Stack</div>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <div>Next.js</div>
              <div>Prisma</div>
              <div>MySQL</div>
              <div>Redis</div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/8 pt-6 text-sm text-slate-600">
          2026 EA SaaS Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
