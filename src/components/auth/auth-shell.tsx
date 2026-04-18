'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Activity, ArrowRight, Shield, Zap } from 'lucide-react';

interface AuthShellProps {
  badge: string;
  title: string;
  description: string;
  sideTitle: string;
  sideDescription: string;
  sideStats: Array<{ label: string; value: string }>;
  children: ReactNode;
}

export function AuthShell({
  badge,
  title,
  description,
  sideTitle,
  sideDescription,
  sideStats,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#020617] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22),rgba(2,6,23,0)_70%)]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12),rgba(2,6,23,0)_70%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_460px]">
          <div className="hidden rounded-[32px] border border-slate-800 bg-[linear-gradient(135deg,#0f172a_0%,#0b1220_100%)] p-8 shadow-2xl lg:block lg:p-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                EA
              </div>
              <div>
                <div className="text-sm font-semibold tracking-[0.2em] text-slate-500">PLATFORM</div>
                <div className="text-lg font-semibold text-white">EA SaaS</div>
              </div>
            </Link>

            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
              <Activity className="h-3.5 w-3.5" />
              {badge}
            </div>

            <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white">
              {sideTitle}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-400">{sideDescription}</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {sideStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mt-0.5 rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Readable under pressure</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">
                    Replace spreadsheet ops and manual access handling with one system that stays clear when markets move fast.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mt-0.5 rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Built for live account control</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">
                    Licensing, risk actions, and operational visibility stay tied together instead of spread across disconnected tools.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="border-b border-slate-800 p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-300">
                <ArrowRight className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-center text-3xl font-bold text-white">{title}</h2>
              <p className="mt-3 text-center text-sm leading-6 text-slate-400">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
