'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import React from 'react';

type Tone = 'teal' | 'amber' | 'rose' | 'slate';

const toneStyles: Record<Tone, { shell: string; icon: string }> = {
  teal: {
    shell: 'border-[#8cc9c2]/15 bg-[linear-gradient(180deg,rgba(140,201,194,0.08),rgba(255,255,255,0.03))]',
    icon: 'bg-[#112129] text-[#8cc9c2]',
  },
  amber: {
    shell: 'border-[#e3a84f]/15 bg-[linear-gradient(180deg,rgba(227,168,79,0.08),rgba(255,255,255,0.03))]',
    icon: 'bg-[#2a2212] text-[#f4c77d]',
  },
  rose: {
    shell: 'border-rose-400/15 bg-[linear-gradient(180deg,rgba(251,113,133,0.08),rgba(255,255,255,0.03))]',
    icon: 'bg-rose-500/10 text-rose-300',
  },
  slate: {
    shell: 'border-white/8 bg-white/[0.03]',
    icon: 'bg-white/[0.06] text-slate-300',
  },
};

export function StatsCard({
  title,
  value,
  trend,
  trendUp,
  icon,
  tone = 'slate',
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
  tone?: Tone;
}) {
  const styles = toneStyles[tone];

  return (
    <Card className={`rounded-[28px] border ${styles.shell}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-3xl font-semibold tracking-tight text-white">{value}</h3>
            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trendUp ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </div>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.icon}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
