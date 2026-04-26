'use client';

import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '@/lib/api';

type TrialPackage = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  maxAccounts: number;
  sortOrder: number;
};

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [packages, setPackages] = useState<TrialPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPackages() {
      try {
        const response = await api.get('/subscriptions/list');
        if (!mounted) return;

        const activePackages = ((response.data.packages ?? []) as TrialPackage[])
          .filter((pkg) => pkg.billingCycle === 'MONTHLY')
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const packageFromUrl = new URLSearchParams(window.location.search).get('packageId');

        setPackages(activePackages);
        setSelectedPackageId(
          activePackages.some((pkg) => pkg.id === packageFromUrl)
            ? packageFromUrl!
            : activePackages[0]?.id ?? ''
        );
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err, 'โหลดแพ็กเกจทดลองไม่สำเร็จ'));
      } finally {
        if (mounted) setIsLoadingPackages(false);
      }
    }

    loadPackages();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!selectedPackageId) {
      setError('กรุณาเลือกแพ็กเกจทดลองก่อนสมัคร');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        packageId: selectedPackageId,
      });

      setSuccess('สมัครสำเร็จ ระบบสร้าง license ทดลองให้แล้ว');
      window.location.href = '/login';
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create account'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="ทดลองใช้งาน 1 เดือน"
      title="เริ่มทดลองใช้ฟรี"
      description="สร้างบัญชีเพื่อรับสิทธิ์ทดลอง 1 เดือน TradeCandle v12 และเริ่มจัดการ AI Gold Bot ของคุณ"
      sideTitle="ปิดกำไรเป็น 3 คลื่น ไม่ต้องนั่งดูจอ"
      sideDescription="ระบบ 3-Wave Cashout + PA/SMC Confluence + Time Filter สำหรับ XAUUSD บน MT5 — ทดลองใช้ 1 เดือน"
      sideStats={[
        { label: 'Trial length', value: '1 เดือน' },
        { label: 'USDT only', value: 'No card' },
        { label: 'Primary pair', value: 'XAUUSD' },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-300">เลือกแพ็กเกจทดลองฟรี</label>
              <p className="mt-1 text-xs text-slate-500">
                ระบบจะสร้าง license ตามจำนวนบัญชีของแพ็กเกจที่เลือกทันทีหลังสมัคร
              </p>
            </div>
            {isLoadingPackages ? (
              <div className="rounded-xl border border-amber-900/30 bg-slate-950 p-4 text-sm text-slate-400">
                กำลังโหลดแพ็กเกจ...
              </div>
            ) : packages.length > 0 ? (
              <div className="grid gap-3">
                {packages.map((pkg) => {
                  const selected = selectedPackageId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-amber-900/30 bg-slate-950 text-slate-300 hover:border-amber-700/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{pkg.name}</div>
                          <div className="mt-1 text-xs text-slate-400">{pkg.maxAccounts} บัญชี MT5 ต่อ License Key</div>
                        </div>
                        <div className="text-sm font-bold text-amber-300">
                          {(pkg.priceCents / 100).toLocaleString()} {pkg.currency}/เดือน
                        </div>
                      </div>
                      {pkg.description ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{pkg.description}</p> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-4 text-sm text-rose-200">
                ยังไม่มีแพ็กเกจที่เปิดให้ทดลอง กรุณาติดต่อผู้ดูแลระบบ
              </div>
            )}
            {selectedPackage ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 text-xs text-amber-100">
                🔑 Trial 1 เดือน: {selectedPackage.name} ใช้ได้สูงสุด {selectedPackage.maxAccounts} บัญชี MT5
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">ชื่อ</label>
            <Input
              type="text"
              placeholder="John Doe"
              className="h-11 rounded-xl border-amber-900/30 bg-slate-950 text-white focus:ring-amber-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            <label className="text-sm font-medium text-slate-300">รหัสผ่าน</label>
            <Input
              type="password"
              className="h-11 rounded-xl border-amber-900/30 bg-slate-950 text-white focus:ring-amber-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">ยืนยันรหัสผ่าน</label>
            <Input
              type="password"
              className="h-11 rounded-xl border-amber-900/30 bg-slate-950 text-white focus:ring-amber-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          {success ? <div className="text-sm text-emerald-300">{success}</div> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button disabled={isLoading || isLoadingPackages || !selectedPackageId} className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500">
            {isLoading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
          </Button>
          <div className="text-center text-sm text-slate-400">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className="text-amber-400 hover:text-amber-300 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </CardFooter>
      </form>
    </AuthShell>
  );
}
