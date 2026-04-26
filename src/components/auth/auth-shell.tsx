'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Activity, ArrowRight, Shield, Waves, Zap } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_50%)]" />
        <div className="absolute left-1/2 top-[10%] h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_460px]">
          <div className="hidden rounded-[32px] border border-amber-900/30 bg-[linear-gradient(135deg,#0f172a_0%,#17120d_100%)] p-8 shadow-2xl shadow-black/40 lg:block lg:p-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-sm font-bold text-black">
                TC
              </div>
              <div>
                <div className="text-sm font-semibold tracking-[0.2em] text-amber-500/70">TRADECANDLE</div>
                <div className="text-lg font-semibold text-white">AI Gold Bot</div>
              </div>
            </Link>

            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              <Waves className="h-3.5 w-3.5" />
              {badge}
            </div>

            <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white">
              {sideTitle}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-400">{sideDescription}</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {sideStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-amber-900/30 bg-slate-900/60 p-4">
                  <div className="text-2xl font-bold text-amber-400">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-900/30 bg-slate-900/50 p-4">
                <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">License key พร้อมใช้งานทันที</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">
                    ซื้อแพ็กเกจแล้วจัดการ EA, license, risk และบัญชี MT5 จาก dashboard เดียว.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-900/30 bg-slate-900/50 p-4">
                <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">3-Wave Cashout + Smart Filters</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">
                    ออกแบบสำหรับ XAUUSD บน MT5 พร้อมระบบติดตามและหยุด EA ได้จากมือถือ.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-900/30 bg-slate-900/95 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="border-b border-amber-900/30 p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-900/30">
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
