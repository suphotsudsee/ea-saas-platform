'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitted(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-white">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-slate-400">
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Link href="/login" className="text-center text-sm text-slate-400 hover:text-slate-300">
                Back to login
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="text-center space-y-4 py-10">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h3 className="text-lg font-semibold">Link Sent</h3>
            <p className="text-slate-400 text-sm">
              If an account exists for this email, you will receive a password reset link shortly.
            </p>
            <Button variant="outline" onClick={() => setSubmitted(false)} className="w-full border-slate-700">
              Try another email
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
