'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Layers, ShieldAlert, Key, CreditCard } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Command Center</h1>
        <p className="text-slate-400">Platform-wide metrics and operational overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminKpiCard title="Total MRR" value="$12,450" trend="+8%" icon={<CreditCard className="text-green-400" />} />
        <AdminKpiCard title="Active Licenses" value="1,240" trend="+12%" icon={<Key className="text-blue-400" />} />
        <AdminKpiCard title="Active EAs" value="3,102" trend="+5%" icon={<Layers className="text-purple-400" />} />
        <AdminKpiCard title="Risk Alerts" value="12" trend="-2%" icon={<ShieldAlert className="text-red-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900 p-6">
            <CardHeader>
              <CardTitle className="text-lg text-white">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <HealthBar label="API Response Time" value={45} max={100} color="bg-green-500" status="45ms" />
                <HealthBar label="Database Load" value={20} max={100} color="bg-green-500" status="20%" />
                <HealthBar label="Redis Memory" value={65} max={100} color="bg-yellow-500" status="65%" />
                <HealthBar label="Worker Queue" value={10} max={100} color="bg-green-500" status="10 items" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start border-slate-700 text-slate-300 hover:bg-slate-800">
                <Users className="w-4 h-4 mr-2" /> Manage Users
              </Button>
              <Button variant="outline" className="justify-start border-slate-700 text-slate-300 hover:bg-slate-800">
                <Key className="w-4 h-4 mr-2" /> Revoke Licenses
              </Button>
              <Button variant="outline" className="justify-start border-slate-700 text-slate-300 hover:bg-slate-800">
                <Layers className="w-4 h-4 mr-2" /> Strategy Config
              </Button>
              <Button variant="destructive" className="justify-start bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40">
                <ShieldAlert className="w-4 h-4 mr-2" /> Global Kill
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminKpiCard({ title, value, trend, icon }: any) {
  return (
    <Card className="border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">{icon}</div>
      </div>
      <div className="mt-4 text-xs text-green-400 font-medium">{trend} vs last month</div>
    </Card>
  );
}

function HealthBar({ label, value, max, color, status }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{status}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={cn(`h-full ${color} transition-all duration-500`)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
