'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatsCard({ title, value, trend, trendUp, icon }: any) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-white">{value}</h3>
            <div className={`flex items-center text-xs font-medium ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {trend}
            </div>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
