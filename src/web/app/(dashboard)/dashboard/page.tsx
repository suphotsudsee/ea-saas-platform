'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PnLChart } from '@/components/dashboard/pnl-chart';
import { RecentTrades } from '@/components/dashboard/recent-trades';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Zap, Shield } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Overview</h1>
          <p className="text-slate-400">Real-time performance tracking and EA status.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300">
            <Activity className="w-3 h-3 mr-1 text-green-400" />
            Live Data
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total P&L" 
          value="$12,450.20" 
          trend="+12.5%" 
          trendUp={true} 
          icon={<TrendingUp className="text-green-400" />} 
        />
        <StatsCard 
          title="Win Rate" 
          value="68.4%" 
          trend="+2.1%" 
          trendUp={true} 
          icon={<Zap className="text-yellow-400" />} 
        />
        <StatsCard 
          title="Active EAs" 
          value="4" 
          trend="Stable" 
          trendUp={true} 
          icon={<Activity className="text-blue-400" />} 
        />
        <StatsCard 
          title="Max Drawdown" 
          value="4.2%" 
          trend="-0.8%" 
          trendUp={false} 
          icon={<Shield className="text-red-400" />} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg text-white">Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <PnLChart />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="border-slate-800 bg-slate-900 h-full">
            <CardHeader>
              <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTrades />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
