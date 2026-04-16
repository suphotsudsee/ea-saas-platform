'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Lock, Bell, Save } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('Settings saved successfully');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        <p className="text-slate-400">Manage your profile and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Section */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Full Name</Label>
                <Input defaultValue="John Doe" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Email Address</Label>
                <Input defaultValue="john@example.com" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Timezone</Label>
                <Input defaultValue="Asia/Bangkok" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              Security & Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Current Password</Label>
                <Input type="password" placeholder="••••••••" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">New Password</Label>
                <Input type="password" placeholder="••••••••" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Confirm New Password</Label>
                <Input type="password" placeholder="••••••••" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Email Notifications</p>
                <p className="text-xs text-slate-500">Receive alerts for risk breaches and subscription updates.</p>
              </div>
              <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">Enabled</Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">In-App Alerts</p>
                <p className="text-xs text-slate-500">Get real-time notifications inside the dashboard.</p>
              </div>
              <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">Enabled</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          disabled={isSaving} 
          className="bg-blue-600 hover:bg-blue-700 px-10" 
          onClick={handleSave}
        >
          {isSaving ? 'Saving...' : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
