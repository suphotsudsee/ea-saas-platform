'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BadgeCheck, Bell, Eye, EyeOff, Lock, Save, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    timezone: 'Asia/Bangkok',
    organization: '',
  });

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      timezone: 'Asia/Bangkok',
      organization: user?.actorType === 'admin' ? 'Administration' : 'Trader workspace',
    });
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-[#8cc9c2]/20 bg-[#112129] px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8cc9c2]">
            Account settings
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Keep operator identity, security, and alerts in sync.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            This section is designed for the practical settings that keep communication and access clean as the account grows.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <UserCircle2 className="h-5 w-5 text-[#8cc9c2]" />
                Profile information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-400">Full name</Label>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile((current) => ({ ...current, name: e.target.value }))}
                  className="rounded-2xl border-white/10 bg-[#0c1720] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Email address</Label>
                <Input
                  value={profile.email}
                  onChange={(e) => setProfile((current) => ({ ...current, email: e.target.value }))}
                  className="rounded-2xl border-white/10 bg-[#0c1720] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Timezone</Label>
                <Input
                  value={profile.timezone}
                  onChange={(e) => setProfile((current) => ({ ...current, timezone: e.target.value }))}
                  className="rounded-2xl border-white/10 bg-[#0c1720] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Organization</Label>
                <Input
                  value={profile.organization}
                  onChange={(e) => setProfile((current) => ({ ...current, organization: e.target.value }))}
                  className="rounded-2xl border-white/10 bg-[#0c1720] text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Lock className="h-5 w-5 text-[#f4c77d]" />
                Security and password
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-slate-400">Current password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="********"
                    className="rounded-2xl border-white/10 bg-[#0c1720] pr-11 text-white"
                  />
                  <button
                    type="button"
                    aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
                    onClick={() => setShowCurrentPw((v) => !v)}
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">New password</Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="********"
                    className="rounded-2xl border-white/10 bg-[#0c1720] pr-11 text-white"
                  />
                  <button
                    type="button"
                    aria-label={showNewPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
                    onClick={() => setShowNewPw((v) => !v)}
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Confirm password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="********"
                    className="rounded-2xl border-white/10 bg-[#0c1720] pr-11 text-white"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
                    onClick={() => setShowConfirmPw((v) => !v)}
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Bell className="h-5 w-5 text-[#8cc9c2]" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <div className="text-sm font-semibold text-white">Email alerts</div>
                <p className="mt-1 text-xs leading-6 text-slate-500">Risk breaches, renewals, and critical operational messages.</p>
                <div className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Enabled
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <div className="text-sm font-semibold text-white">In-app alerts</div>
                <p className="mt-1 text-xs leading-6 text-slate-500">Live dashboard notifications for account and license activity.</p>
                <div className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Enabled
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-white/8 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-xl text-white">Workspace status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0c1720] p-4">
                <BadgeCheck className="h-5 w-5 text-[#8cc9c2]" />
                <div>
                  <div className="text-sm font-semibold text-white">Identity healthy</div>
                  <div className="text-xs text-slate-500">Primary account metadata is complete.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="rounded-full bg-[#e3a84f] px-6 text-[#14110c] hover:bg-[#efb65d]">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
