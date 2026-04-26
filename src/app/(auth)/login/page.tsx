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
      badge="AI Gold Trading Bot"
      title="เข้าสู่ระบบ"
      description="เข้าใช้งาน dashboard เพื่อจัดการ License Key, EA และบัญชีเทรดของคุณ"
      sideTitle="AI เทรดทองคำอัตโนมัติ"
      sideDescription="3-Wave Cashout + 6 Smart Money Filters บน MT5 พร้อม dashboard สำหรับควบคุม license, risk และสถานะบัญชีแบบเรียลไทม์."
      sideStats={[
        { label: 'XAUUSD', value: 'MT5' },
        { label: 'Smart filters', value: '6' },
        { label: 'Uptime target', value: '99.9%' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">อีเมล</label>
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
              <label className="text-sm font-medium text-slate-300">รหัสผ่าน</label>
              <Link href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <Input
              type="password"
              className="h-11 rounded-xl border-amber-900/30 bg-slate-950 text-white focus:ring-amber-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button disabled={isLoading} className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500">
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
          <Link
            href="/admin/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-4 w-4" />
            Admin login
          </Link>
          <div className="text-center text-sm text-slate-400">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="text-amber-400 hover:text-amber-300 hover:underline">
              ทดลองใช้ฟรี
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
