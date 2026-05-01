'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

export default function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await adminLogin(email, password);
    } catch {
      alert('Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Admin access"
      title="Admin login"
      description="Sign in with your admin account to access the command center."
      sideTitle="Separate control flow for platform operators."
      sideDescription="Use the admin console for license operations, customer oversight, revenue controls, and emergency risk actions."
      sideStats={[
        { label: 'Access mode', value: 'Admin' },
        { label: 'Privilege scope', value: 'Role based' },
        { label: 'Session window', value: '24h' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Admin email</label>
            <Input
              type="email"
              placeholder="admin@ea-saas.com"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                className="h-11 rounded-xl border-slate-800 bg-slate-950 pr-11 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button disabled={isLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {isLoading ? 'Authenticating...' : 'Sign in to admin'}
          </Button>
          <div className="text-center text-sm text-slate-400">
            Need trader access instead?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 hover:underline">
              Go to user login
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
