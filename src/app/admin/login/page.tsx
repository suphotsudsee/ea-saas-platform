'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
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
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Read from DOM refs to capture autofill/copy-paste values
      const emailValue = emailRef.current?.value ?? email;
      const passwordValue = passwordRef.current?.value ?? password;
      await adminLogin(emailValue, passwordValue);
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
              ref={emailRef}
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
              ref={passwordRef}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
