'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Save } from 'lucide-react';

export function RiskRuleEditor({ rule }: any) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          {rule.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-400">Threshold (%)</Label>
          <Input defaultValue={rule.value} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-400">Action on Breach</Label>
          <select className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 text-sm text-white">
            <option>Kill EA</option>
            <option>Pause EA</option>
            <option>Notify Admin Only</option>
          </select>
        </div>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" /> Save Rule
        </Button>
      </CardContent>
    </Card>
  );
}
