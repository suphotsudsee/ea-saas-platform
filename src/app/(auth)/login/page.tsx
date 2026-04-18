'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      alert('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Client access"
      title="Welcome back"
      description="Enter your details to access your trading dashboard and account controls."
      sideTitle="MT4 and MT5 operations layer."
      sideDescription="Control licensing, risk, and live EA operations from one surface. Built for teams selling or operating Expert Advisors at scale."
      sideStats={[
        { label: 'Active traders', value: '12,000+' },
        { label: 'Uptime target', value: '99.9%' },
        { label: 'Trades monitored', value: '150M+' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <Input
              type="email"
              placeholder="name@company.com"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button disabled={isLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </Button>
          <Link
            href="/admin/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-4 w-4" />
            Admin login
          </Link>
          <div className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 hover:underline">
              Start free trial
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
