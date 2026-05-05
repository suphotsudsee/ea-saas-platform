'use client';

import Link from 'next/link';
<<<<<<< HEAD
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
      badge="AI Gold Trading Bot"
      title="Log In"
      description="Log in to your dashboard to manage license keys, EA settings, and trading accounts"
      sideTitle="Automated AI Gold Trading"
      sideDescription="3-Wave Cashout + 6 Smart Money Filters on MT5. Dashboard for real-time license management, risk control, and account status monitoring."
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
            <Input
              type="email"
              placeholder="name@email.com"
              className="h-11 rounded-xl border-amber-900/30 bg-slate-950 text-white focus:ring-amber-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                className="h-11 rounded-xl border-amber-900/30 bg-slate-950 pr-11 text-white focus:ring-amber-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button disabled={isLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500">
            {isLoading ? 'Logging in...' : 'Log In'}
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
            <Link href="/register" className="text-amber-400 hover:text-amber-300 hover:underline">
              Free Trial
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
=======
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'Invalid credentials');
        setIsLoading(false);
        return;
      }

      // Store token and redirect
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Network error — please try again');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="AI Gold Trading Bot"
      title="Log In"
      description="Log in to your dashboard to manage license keys, EA settings, and trading accounts"
      sideTitle="Automated AI Gold Trading"
      sideDescription="3-Wave Cashout + 6 Smart Money Filters on MT5. Dashboard for real-time license management, risk control, and account status monitoring."
      sideStats={[
        { label: 'XAUUSD', value: 'MT5' },
        { label: 'Smart filters', value: '6' },
        { label: 'Uptime target', value: '99.9%' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <Input
              type="email"
              placeholder="name@email.com"
              className="h-11 rounded-xl border-amber-900/30 bg-slate-950 text-white focus:ring-amber-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                className="h-11 rounded-xl border-amber-900/30 bg-slate-950 pr-11 text-white focus:ring-amber-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500">
            {isLoading ? 'Logging in...' : 'Log In'}
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
            <Link href="/register" className="text-amber-400 hover:text-amber-300 hover:underline">
              Free Trial
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
>>>>>>> cba4206f46728294b317464c4728579d35ff872d
