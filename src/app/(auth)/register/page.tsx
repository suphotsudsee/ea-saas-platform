'use client';

import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useState } from 'react';
import api from '@/lib/api';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
      });

      setSuccess('Registration successful. You can sign in now.');
      window.location.href = '/login';
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Trial onboarding"
      title="Start your free trial"
      description="Create your account and start operating your trading stack from one clean control surface."
      sideTitle="Built for teams selling or operating EAs at scale."
      sideDescription="Replace spreadsheet ops, fragile scripts, and manual account handling with one system that stays readable under pressure."
      sideStats={[
        { label: 'Trial length', value: '14 days' },
        { label: 'Card needed', value: 'No' },
        { label: 'Setup speed', value: '< 10 min' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Full name</label>
            <Input
              type="text"
              placeholder="John Doe"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            <label className="text-sm font-medium text-slate-300">Password</label>
            <Input
              type="password"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Confirm password</label>
            <Input
              type="password"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          {success ? <div className="text-sm text-emerald-300">{success}</div> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button disabled={isLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
            {isLoading ? 'Creating Account...' : 'Create account'}
          </Button>
          <div className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 hover:underline">
              Log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
