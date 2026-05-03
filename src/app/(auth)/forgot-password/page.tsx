'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        badge="AI Gold Trading Bot"
        title="Check Your Email"
        description="If an account exists for that email, we've sent a password reset link."
        sideTitle="Automated AI Gold Trading"
        sideDescription="3-Wave Cashout + 6 Smart Money Filters on MT5."
        sideStats={[
          { label: 'XAUUSD', value: 'MT5' },
          { label: 'Smart filters', value: '6' },
          { label: 'Uptime target', value: '99.9%' },
        ]}
      >
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-slate-300">
            Check your inbox and spam folder for the reset link. The link expires in 1 hour.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center p-6 pt-0">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="AI Gold Trading Bot"
      title="Forgot Password"
      description="Enter your email and we'll send you a reset link."
      sideTitle="Automated AI Gold Trading"
      sideDescription="3-Wave Cashout + 6 Smart Money Filters on MT5."
      sideStats={[
        { label: 'XAUUSD', value: 'MT5' },
        { label: 'Smart filters', value: '6' },
        { label: 'Uptime target', value: '99.9%' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <div className="relative">
              <Input
                type="email"
                placeholder="name@email.com"
                className="h-11 rounded-xl border-amber-900/30 bg-slate-950 pl-11 text-white focus:ring-amber-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button
            type="submit"
            disabled={isLoading || !email}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
