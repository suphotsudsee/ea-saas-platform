'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import React from 'react';

type Tone = 'teal' | 'amber' | 'rose' | 'slate';

const toneStyles: Record<Tone, { shell: string; icon: string }> = {
  teal: {
    shell: 'border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.09),rgba(255,255,255,0.03))]',
    icon: 'bg-amber-500/10 text-amber-300',
  },
  amber: {
    shell: 'border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.09),rgba(255,255,255,0.03))]',
    icon: 'bg-amber-500/10 text-amber-300',
  },
  rose: {
    shell: 'border-rose-400/15 bg-[linear-gradient(180deg,rgba(251,113,133,0.08),rgba(255,255,255,0.03))]',
    icon: 'bg-rose-500/10 text-rose-300',
  },
  slate: {
    shell: 'border-amber-900/30 bg-white/[0.03]',
    icon: 'bg-amber-500/10 text-amber-300',
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
            <p className="text-sm font-medium text-amber-500/60">{title}</p>
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
