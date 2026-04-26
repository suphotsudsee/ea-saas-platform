'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Shield,
  Zap,
  BarChart3,
  Layers,
  Terminal,
  CheckCircle,
  Server,
  Globe,
  ArrowRight,
  Menu,
  X,
  Settings,
  AlertTriangle,
  Lock,
  RefreshCw,
  Cpu,
  ChevronDown,
  Waves,
  TrendingUp,
  Smartphone,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

type PageId = 'home' | 'features' | 'workflow' | 'pricing' | 'login' | 'register';

function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  className?: string;
  onClick?: () => void;
}) {
  const baseStyle =
    'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200';
  const variants = {
    primary:
      'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-yellow-500 font-bold',
    secondary: 'border border-amber-900/50 bg-amber-950/30 text-amber-200 hover:bg-amber-900/30',
    ghost: 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
    outline: 'border border-amber-500/50 text-amber-400 hover:bg-amber-500/10',
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

/* ─── Section 1: Hero ──────────────────────────────────────────────────── */
function HomePage({ navigateTo }: { navigateTo: (page: PageId) => void }) {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero */}
      <section className="relative min-h-[92vh] overflow-hidden border-b border-amber-900/20 pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_50%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[16%] h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[150px]" />

        <div className="container relative z-10 mx-auto max-w-[900px] px-6 text-center">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
            <Waves size={14} />
            <span>AI Gold Trading Bot — Version 12</span>
          </div>

          <h1 className="mb-8 text-5xl font-extrabold leading-[0.92] tracking-tight text-white md:text-[6.2rem]">
            AI เทรดทองคำ
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              อัตโนมัติ
            </span>
          </h1>

          <p className="mx-auto mb-4 text-2xl font-semibold text-amber-200 md:text-3xl">
            ปิดกำไรเป็น 3 คลื่น ไม่ต้องนั่งดูจอ
          </p>

          <p className="mx-auto mb-12 max-w-[720px] text-lg leading-relaxed text-slate-400 md:text-[1rem] md:leading-[1.65]">
            3-Wave Cashout + 6 Smart Money Filters + Time Filter บน MT5 — ทดลอง 1 เดือน ไม่ต้องจ่ายก่อน
            <br />
            ควบคุมจาก Dashboard หยุด EA ได้จากมือถือทุกที่ทุกเวลา
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={() => navigateTo('pricing')} className="w-full rounded-xl px-14 py-3.5 text-base sm:w-auto">
              เริ่มต้น 990฿/เดือน <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              onClick={() => navigateTo('features')}
              variant="secondary"
              className="w-full rounded-xl px-12 py-3.5 text-base sm:w-auto"
            >
              ดูวิธีทำงาน
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> MT5</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> XAUUSD</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> 24/5</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-amber-500" /> SaaS Dashboard</span>
          </div>
          <p className="mt-3 text-sm text-amber-500/70">⭐ ทดลองใช้ 1 เดือน ไม่ต้องจ่ายก่อน</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 gap-8 divide-x divide-amber-900/0 md:grid-cols-4 md:divide-amber-900/30">
            {[
              { label: '3-Wave Cashout', value: '✅' },
              { label: 'Smart Money Filters', value: '6' },
              { label: 'Uptime Target', value: '99.9%' },
              { label: 'Thai Support', value: '🇹🇭' },
            ].map((stat) => (
              <div key={stat.label} className="px-4 text-center">
                <div className="mb-1 text-3xl font-bold text-amber-400 md:text-4xl">{stat.value}</div>
                <div className="text-sm font-medium text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 2: Pain Points ──────────────────────────────────────── */}
      <BacktestPerformanceSection />

      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">เคยเป็นไหม?</h2>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: '😰', text: 'ราคาทองขึ้น +$80 แต่รอ TP เต็ม → ราคากลับ → กำไรหายหมด' },
              { emoji: '😫', text: 'นั่งดูจอ 8 ชม. พอเผลอ 5 นาที → พลาดจังหวะ' },
              { emoji: '😤', text: 'ตั้ง SL แน่นไป → โดน stop hunt ทุกที' },
              { emoji: '😞', text: 'ซื้อ EA มาใช้ 3 วันก็ขาดทุน → เก็บเข้ากรุ' },
              { emoji: '🤔', text: 'ไม่รู้ว่า EA ที่รันอยู่ตอนนี้ กำไรหรือขาดทุน?' },
              { emoji: '😰', text: 'EA filter แรงเกิน → ไม่ยอมเปิดออเดอร์เลย' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-red-900/30 bg-red-950/10 p-6 transition-colors hover:border-red-900/50">
                <div className="mb-3 text-2xl">{item.emoji}</div>
                <p className="text-sm leading-relaxed text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 3: 3-Wave Cashout Solution ─────────────────────────── */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/30 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              💡 แก้ด้วย <span className="text-amber-400">3-Wave Cashout</span> System
            </h2>
            <p className="text-slate-400">ปิดกำไรเป็น 3 รอบ — ยังไงก็ได้กำไรบางส่วน ไม่รอ TP เต็ม 100%</p>
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="absolute left-0 top-1/2 z-0 hidden h-0.5 w-full -translate-y-1/2 bg-amber-900/30 md:block" />

            <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: 'W1',
                  title: 'Wave 1 — ล็อคแรก',
                  pct: '25% TP',
                  desc: 'ปิด 1/3 ของ lot ที่ 25% ของ TP — กำไรแรกล็อคแล้ว ไม่กลับมาเป็นขาดทุนได้',
                  color: 'from-green-600 to-green-500',
                  icon: CheckCircle,
                },
                {
                  step: 'W2',
                  title: 'Wave 2 — เพิ่มกำไร',
                  pct: '50% TP',
                  desc: 'ปิด 1/3 ถัดไปที่ 50% ของ TP — กำไรเพิ่มขึ้น ยังเหลือ lot สุดท้าย',
                  color: 'from-green-500 to-emerald-400',
                  icon: TrendingUp,
                },
                {
                  step: 'W3',
                  title: 'Wave 3 — ไล่เทรนด์',
                  pct: 'Trailing',
                  desc: 'Breakeven + Trailing Stop — ไล่ตามเทรนด์ กำไรไม่จำกัด ถ้าราคาวิ่งต่อ',
                  color: 'from-emerald-400 to-amber-400',
                  icon: Waves,
                },
              ].map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-amber-900/30 bg-slate-900 p-8 shadow-xl">
                  <div className="absolute left-8 top-[-2rem] flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/50 bg-slate-950 shadow-lg shadow-black/50">
                    <span className={`bg-gradient-to-b ${item.color} bg-clip-text text-xl font-bold text-transparent`}>
                      {item.step}
                    </span>
                  </div>
                  <div className="mt-6">
                    <item.icon size={28} className="mb-5 text-amber-500" />
                    <h3 className="mb-2 text-xl font-bold text-white">{item.title}</h3>
                    <p className="mb-3 font-mono text-sm text-amber-400">{item.pct}</p>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-6 text-center">
              <p className="mb-2 text-lg font-bold text-red-400">❌ EA ทั่วไป</p>
              <p className="text-sm text-slate-400">รอ TP 100% → ราคากลับ → ขาดทุน</p>
            </div>
            <div className="rounded-xl border border-green-900/30 bg-green-950/10 p-6 text-center">
              <p className="mb-2 text-lg font-bold text-green-400">✅ TradeCandle v12</p>
              <p className="text-sm text-slate-400">ปิดทยอย 3 รอบ → ยังไงก็ได้กำไร</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Smart Money Filters ──────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              🔓 6 <span className="text-amber-400">Smart Money</span> Filters
            </h2>
            <p className="text-slate-400">
              ระบบอ่านทรงสตรัคเจอร์เหมือนโปรเทรดเดอร์ แต่ทำงานอัตโนมัติทุก tick
              <br />
              เป็น <strong className="text-amber-300">Bonus Score</strong> — ไม่บล็อกสัญญาณ
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '⚡', name: 'BOS', full: 'Break of Structure', score: '±1', desc: 'ทรงสตรัคเจอร์แตก — ราคาทะลุจุดสูง/ต่ำสุดเดิม' },
              { icon: '🔄', name: 'CHoCH', full: 'Change of Character', score: '±2', desc: 'เทรนด์เปลี่ยนทิศ — จากขึ้นเป็นลง หรือลงเป็นขึ้น' },
              { icon: '🧱', name: 'OB', full: 'Order Block', score: '±1', desc: 'โซนที่สถาบันเข้า position — จุดกลับราคาสำคัญ' },
              { icon: '📐', name: 'FVG', full: 'Fair Value Gap', score: '±1', desc: 'ช่องว่างราคาที่ราคาวิ่งผ่านเร็ว — มักกลับมาเติม' },
              { icon: '💧', name: 'Liq Sweep', full: 'Liquidity Sweep', score: '±2', desc: 'ล่าสภาพคล่อง (stop hunt) — ราคาแตะจุดแล้วกลับทิศ' },
              { icon: '📦', name: 'S/D', full: 'Supply/Demand Zone', score: '±1', desc: 'โซนอุปสงค์-อุปทาน — จุดที่กองทุนเคยเข้า' },
            ].map((filter) => (
              <div key={filter.name} className="rounded-xl border border-amber-900/20 bg-slate-900/40 p-5 transition-colors hover:border-amber-900/40 hover:bg-slate-800/40">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{filter.icon}</span>
                    <span className="text-lg font-bold text-white">{filter.name}</span>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-400">
                    {filter.score}
                  </span>
                </div>
                <p className="mb-2 text-sm font-medium text-amber-300">{filter.full}</p>
                <p className="text-sm text-slate-400">{filter.desc}</p>
              </div>
            ))}
          </div>

          {/* Confluence Gate */}
          <div className="mx-auto mt-10 max-w-xl rounded-xl border border-amber-700/30 bg-amber-950/20 p-6 text-center">
            <p className="mb-2 text-lg font-bold text-amber-300">🚦 Confluence Gate</p>
            <p className="text-sm text-slate-400">
              ต้อง ≥2 filters ชี้ข้ามเดียวกัน + ไม่มี opposing → ถึงจะเพิ่มคะแนน
              <br />
              กรองสัญญาณอ่อน ไม่แทรกแซงสัญญาณแข็งแกร่ง
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 5: SaaS Platform Features ───────────────────────────── */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/30 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              📱 ควบคุมจากมือถือ ทุกที่ ทุกเวลา
            </h2>
            <p className="text-slate-400">SaaS Dashboard ให้คุณเห็น คุม และหยุด EA ได้จากที่ไหนก็ได้</p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Lock, title: '🔑 License Key รับทันที', desc: 'ซื้อ → รับ key → วางใน MT5 → เริ่มเทรด', color: 'text-amber-400' },
              { icon: Activity, title: '💓 Heartbeat Monitoring', desc: 'รู้ทันทีว่า EA ยังรันอยู่ไหม ไม่ต้องเปิด MT5', color: 'text-green-400' },
              { icon: BarChart3, title: '📊 Dashboard Real-time', desc: 'P&L, Win Rate, Drawdown, ทุกบัญชี ในหน้าเดียว', color: 'text-cyan-400' },
              { icon: AlertTriangle, title: '🛑 Kill Switch', desc: 'หยุด EA ทันทีจากมือถือ ไม่ต้องเข้า VPS', color: 'text-red-400' },
              { icon: Shield, title: '🛡️ Risk Management', desc: 'DD limit, Session filter, Spread filter จากแพลตฟอร์ม', color: 'text-yellow-400' },
              { icon: RefreshCw, title: '🔄 Auto Config Sync', desc: 'อัปเดตพารามิเตอร์ EA จากเว็บ ไม่ต้อง restart', color: 'text-purple-400' },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 transition-colors hover:bg-slate-800/40">
                <feature.icon size={24} className={`mb-4 ${feature.color}`} />
                <h4 className="mb-2 text-base font-semibold text-white">{feature.title}</h4>
                <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 6: Social Proof ─────────────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              ⭐ เทรดเดอร์ทองพูดถึงเรา
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { quote: '"ตื่นมาเช้า เปิด MT5 เห็น +$340 ไม่ต้องทำอะไรเลย"', name: 'พี่ตู้', role: 'เทรดเดอร์ทอง 5 ปี' },
              { quote: '"3-Wave คือเกมเชนเจอร์ ก่อนนี้ใช้ EA อื่นรอ TP เต็ม ราคากลับทุกที ตอนนี้ปิด Wave 1 ได้กำไรแล้ว"', name: 'เจม', role: 'Swing Trader' },
              { quote: '"Dashboard ดูง่าย รู้เลยว่า EA ตัวนี้กำไรหรือขาดทุน ไม่ต้องเข้า MT5 ดูทีละบัญชี"', name: 'บอย', role: 'Full-time Trader' },
            ].map((review, i) => (
              <div key={i} className="rounded-2xl border border-amber-900/20 bg-slate-900/60 p-8">
                <p className="mb-6 text-sm leading-relaxed text-slate-300">{review.quote}</p>
                <div>
                  <p className="font-bold text-amber-300">{review.name}</p>
                  <p className="text-sm text-slate-500">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 7: Pricing ──────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-amber-900/20 bg-slate-900/30 py-24" id="pricing-section">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">💰 เลือกแพ็คเกจที่ใช่</h2>
            <p className="text-slate-400">ทดลอง 1 เดือนฟรี ไม่ต้องจ่ายก่อน — ยกเลิกได้ทุกเมื่อ</p>
          </div>

          {/**<PricingCards navigateTo={navigateTo} />**/}
          <PricingPage embedded />
        </div>
      </section>

      {/* ─── Section 8: FAQ ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">❓ คำถามที่พบบ่อย</h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {[
              { q: 'ต้องนั่งดูจอไหม?', a: 'ไม่ต้อง! EA ทำงานอัตโนมัติ 24/5 คุณดูผลจาก Dashboard ได้' },
              { q: 'ใช้กับโบรกเกอร์ไหนได้บ้าง?', a: 'โบรกเกอร์ที่รองรับ MT5 ทุกค่าย (Exness, XM, IC Markets ฯลฯ)' },
              { q: 'ขั้นต่ำทุนเทรดเท่าไหร่?', a: 'แนะนำ $500+ (0.01 lot) หรือ $2,000+ (0.03 lot)' },
              { q: 'มี guarantee ไหม?', a: 'ทดลอง 1 เดือนฟรี ไม่พอใจยกเลิกได้ ไม่หักเงิน + 30 วันเงินคืน' },
              { q: 'EA รันบนคอมผมหรือ Cloud?', a: 'รันบน MT5 ของคุณเอง (VPS แนะนำ) เราให้ license + dashboard' },
              { q: 'ต่างจาก EA ฟรียังไง?', a: '3-Wave Cashout + Smart Money Filters + SaaS Dashboard + Thai Support' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-amber-900/20 bg-slate-900/40">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-base font-semibold text-white hover:text-amber-300">
                  {faq.q}
                  <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 9: Final CTA ────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-amber-900/20 bg-gradient-to-b from-amber-950/20 to-transparent py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            🔥 พร้อมให้ AI เทรดทองให้คุณแล้วหรือยัง?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-slate-400">
            เริ่มต้น 990บาท/เดือน — ทดลอง 1 เดือนฟรี ไม่ต้องจ่ายก่อน — ยกเลิกได้ทุกเมื่อ
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={() => navigateTo('register')} className="w-full rounded-xl px-14 py-3.5 text-base sm:w-auto">
              🚀 เริ่มต้น 1 เดือนฟรี <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button variant="secondary" className="w-full rounded-xl px-12 py-3.5 text-base sm:w-auto">
              💬 สอบถาม Line OA
            </Button>
          </div>
          <p className="mt-5 text-sm text-amber-500/80">⏰ สมัครเดือนนี้ รับส่วนลด 20% ทุกแพ็คเกจ!</p>
        </div>
      </section>
    </div>
  );
}

/* ─── Pricing Page (also used inline) ──────────────────────────────────── */
function PricingPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <section className={embedded ? '' : 'px-4 pb-24 pt-32 sm:px-6 lg:pt-36'}>
      {!embedded && (
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">
            เลือกแพ็กเกจที่เหมาะกับคุณ
          </h1>
          <p className="text-base text-slate-400 md:text-lg">
            ทดลอง 1 เดือนฟรี จ่ายผ่าน USDT และจัดการ License ได้จาก Dashboard
          </p>
        </div>
      )}

    <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 md:grid-cols-3">
      {/* Starter */}
      <div className="rounded-2xl border border-amber-900/20 bg-slate-900 p-8 transition-colors hover:border-amber-900/40">
        <h3 className="mb-2 text-xl font-bold text-white">Starter</h3>
        <p className="h-10 text-sm text-slate-400">สำหรับเทรดเดอร์เริ่มต้น 1 บัญชี</p>
        <div className="my-6">
          <span className="text-4xl font-bold text-white">990฿</span>
          <span className="text-slate-500">/ เดือน</span>
        </div>
        <ul className="mb-8 space-y-4 text-sm text-slate-300">
          {['1 บัญชี MT5', 'SaaS Dashboard', '3-Wave Cashout', '6 Smart Money Filters', 'Time Filter', 'Email Support'].map((item, index) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle size={16} className={index === 3 ? 'text-slate-600' : 'text-amber-500'} />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="w-full" onClick={() => { window.location.href = '/register?packageId=pkg_starter'; }}>
          ทดลอง 1 เดือน
        </Button>
      </div>

      {/* Pro ⭐ */}
      <div className="relative rounded-2xl border border-amber-500/50 bg-gradient-to-b from-amber-900/30 to-slate-900 p-8 shadow-2xl shadow-amber-900/20 md:-translate-y-4">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
            ยอดนิยม
          </span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">Pro ⭐</h3>
        <p className="h-10 text-sm text-slate-400">สำหรับเทรดเดอร์จริงจัง 3 บัญชี</p>
        <div className="my-6">
          <span className="text-4xl font-bold text-white">2,490฿</span>
          <span className="text-slate-500">/ เดือน</span>
        </div>
        <ul className="mb-8 space-y-4 text-sm font-medium text-white">
          {['3 บัญชี MT5', 'Dashboard + Kill Switch', '3-Wave Cashout', '6 PA/SMC Filters', 'Time Filter', 'Line Support'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle size={16} className="text-amber-400" />
              {item}
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={() => { window.location.href = '/register?packageId=pkg_pro'; }}>ทดลอง 1 เดือน</Button>
      </div>

      {/* Elite */}
      <div className="rounded-2xl border border-amber-900/20 bg-slate-900 p-8 transition-colors hover:border-amber-900/40">
        <h3 className="mb-2 text-xl font-bold text-white">Elite</h3>
        <p className="h-10 text-sm text-slate-400">สำหรับมืออาชีพ 5 บัญชี + VIP</p>
        <div className="my-6">
          <span className="text-4xl font-bold text-white">4,990฿</span>
          <span className="text-slate-500">/ เดือน</span>
        </div>
        <ul className="mb-8 space-y-4 text-sm text-slate-300">
          {['5 บัญชี MT5', 'ทุกอย่างใน Pro', 'Custom EA Config', 'VIP Line + 1-on-1 Setup Call'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle size={16} className="text-amber-500" />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="w-full" onClick={() => { window.location.href = '/register?packageId=pkg_elite'; }}>
          ทดลอง 1 เดือน
        </Button>
      </div>
    </div>
    </section>
  );
}

function BacktestPerformanceSection() {
  const metrics = [
    { label: 'Total Net Profit', value: '+$4,857.85', tone: 'text-emerald-300' },
    { label: 'Win Rate', value: '74.75%', tone: 'text-amber-300' },
    { label: 'Total Trades', value: '7,353', tone: 'text-white' },
    { label: 'Max Equity DD', value: '3.94%', tone: 'text-sky-300' },
    { label: 'Profit Factor', value: '1.23', tone: 'text-white' },
    { label: 'Sharpe Ratio', value: '8.35', tone: 'text-emerald-300' },
  ];

  const reportFacts = [
    ['Expert', 'trade_candle_v12'],
    ['Symbol', 'XAUUSD'],
    ['Timeframe', 'M5'],
    ['Period', '2025.04.01 - 2026.04.03'],
    ['Initial Deposit', '$10,000'],
    ['Broker', 'Exness-MT5Trial7'],
  ];

  return (
    <section className="relative z-10 border-y border-amber-900/20 bg-[#080d19] py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
            <BarChart3 size={14} />
            <span>Strategy Tester Report</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            ผลงานทดสอบย้อนหลัง TradeCandle v12
          </h2>
          <p className="text-sm leading-relaxed text-slate-400 md:text-base">
            รายงานจาก MT5 Strategy Tester บน XAUUSD M5 ช่วง 1 เม.ย. 2025 ถึง 3 เม.ย. 2026
            ใช้เงินเริ่มต้น $10,000 และ fixed lot 0.03
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-amber-900/20 bg-slate-950/70 p-4 text-center">
              <div className={`text-2xl font-extrabold ${metric.tone}`}>{metric.value}</div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-2xl border border-amber-900/25 bg-slate-950/70 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-amber-900/20 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">Balance Graph</h3>
                <p className="text-xs text-slate-500">MT5 Strategy Tester export</p>
              </div>
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                +48.58%
              </div>
            </div>
            <div className="bg-white p-3">
              <img
                src="/backtests/trade-candle-v12-balance.png"
                alt="TradeCandle v12 balance graph from MT5 Strategy Tester"
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-900/25 bg-slate-950/70 p-6">
            <h3 className="mb-5 font-semibold text-white">รายละเอียดรายงาน</h3>
            <div className="space-y-3">
              {reportFacts.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-800/70 pb-3 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-medium text-slate-200">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-900/25 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-100/80">
              ผลทดสอบย้อนหลังใช้เพื่อประกอบการพิจารณาเท่านั้น ผลลัพธ์จริงขึ้นกับ broker, spread,
              slippage, VPS และสภาพตลาดในเวลานั้น
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            ['/backtests/trade-candle-v12-histogram.png', 'Profit distribution histogram'],
            ['/backtests/trade-candle-v12-mfemae.png', 'MFE MAE analysis graph'],
            ['/backtests/trade-candle-v12-holding.png', 'Holding time graph'],
          ].map(([src, alt]) => (
            <div key={src} className="overflow-hidden rounded-xl border border-amber-900/20 bg-slate-950/70">
              <div className="bg-white p-2">
                <img src={src} alt={alt} className="h-auto w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features Page ────────────────────────────────────────────────────── */
function FeaturesPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            ทำไม <span className="text-amber-400">TradeCandle v12</span>
            <br />
            ต่างจาก EA ทั่วไป
          </h1>
          <p className="text-lg text-slate-400">
            ทุกฟีเจอร์ถูกออกแบบมาแก้ปัญหาจริงของเทรดเดอร์ทองคำ
          </p>
        </div>

        <div className="mx-auto mb-24 grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-900/20 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <RefreshCw size={24} className="text-amber-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">กำไรไม่หายระหว่างทาง</h3>
            <p className="leading-relaxed text-slate-400">
              3-Wave Cashout ปิดกำไรทยอย 3 รอบ — ไม่รอ TP เต็ม 100% ที่อาจไม่ถึง
              Wave 1 ล็อคกำไรแรก Wave 2 เพิ่ม Wave 3 ไล่เทรนด์
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/20 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Shield size={24} className="text-green-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Smart Money ไม่บล็อกสัญญาณ</h3>
            <p className="leading-relaxed text-slate-400">
              6 PA/SMC Filters เป็น Bonus Score ไม่ใช่ Gate — ไม่มีปัญหา over-filter
              Confluence Gate ต้อง ≥2 ตัวชี้ข้ามเดียวกันถึงจะเพิ่มคะแนน
            </p>
          </div>
        </div>

        <h2 className="mb-12 text-center text-3xl font-bold text-white">Platform Capabilities</h2>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: Lock,
              title: 'License Key อัตโนมัติ',
              desc: 'ซื้อ → รับ key → วางใน MT5 → เริ่มเทรด ผูกบัญชีอัตโนมัติผ่าน Heartbeat',
            },
            {
              icon: AlertTriangle,
              title: 'Risk Management จากแพลตฟอร์ม',
              desc: 'DD limit, Session filter, Spread filter คุ้มครองระดับแพลตฟอร์ม ไม่ขึ้นกับ EA',
            },
            {
              icon: BarChart3,
              title: 'Dashboard Real-time',
              desc: 'P&L, Win Rate, Drawdown, Trade History ทุกบัญชี ในหน้าเดียว',
            },
            {
              icon: Zap,
              title: 'Kill Switch หยุดทันที',
              desc: 'กดปุ่มเดียวจากมือถือ EA หยุดทันที ไม่ต้องเข้า VPS',
            },
            {
              icon: Server,
              title: 'Subscription + Billing ครบ',
              desc: 'ชำระเงินผ่าน USDT (ERC-20), ทดลองใช้, ต่ออายุอัตโนมัติ',
            },
            {
              icon: Layers,
              title: 'Thai Support ตอบไว',
              desc: 'Line OA ตอบทุกคำถาม Pro+ ขึ้นไปมี Line priority support',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-amber-900/10 bg-slate-900/40 p-6 transition-colors hover:bg-slate-800/40"
            >
              <feature.icon size={24} className="mb-4 text-amber-400" />
              <h4 className="mb-2 text-lg font-semibold text-white">{feature.title}</h4>
              <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Workflow Page ─────────────────────────────────────────────────────── */
function WorkflowPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20 pt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            เริ่มใช้ <span className="text-amber-400">3 ขั้นตอน</span>
          </h1>
          <p className="text-lg text-slate-400">จากสมัคร ถึงเทรดอัตโนมัติ ใช้เวลาไม่ถึง 10 นาที</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="absolute left-0 top-1/2 z-0 hidden h-0.5 w-full -translate-y-1/2 bg-amber-900/30 md:block" />

          <div className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'สมัคร + รับ License Key',
                desc: 'เลือกแพ็คเกจ → โอน USDT → รับ key ทันทีใน Dashboard',
                icon: Settings,
              },
              {
                step: '02',
                title: 'วาง Key ใน MT5',
                desc: 'ดาวน์โหลด EA → วาง License Key → ผูกบัญชีอัตโนมัติผ่าน Heartbeat',
                icon: Cpu,
              },
              {
                step: '03',
                title: 'เทรดอัตโนมัติ + ดูผล',
                desc: 'EA เทรด 24/5 คุณดูผลจากมือถือ หยุดได้ทันทีด้วย Kill Switch',
                icon: Activity,
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl border border-amber-900/30 bg-slate-900 p-8 shadow-xl">
                <div className="absolute left-8 top-[-2rem] flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/50 bg-slate-950 shadow-lg shadow-black/50">
                  <span className="bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-xl font-bold text-transparent">
                    {item.step}
                  </span>
                </div>
                <div className="mt-6">
                  <item.icon size={28} className="mb-5 text-amber-500" />
                  <h3 className="mb-3 text-xl font-bold text-white">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Auth Page ─────────────────────────────────────────────────────────── */
function AuthPage({
  mode,
  navigateTo,
}: {
  mode: 'login' | 'register';
  navigateTo: (page: PageId) => void;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      window.location.href = '/register';
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError('ข้อมูลไม่ถูกต้อง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in flex min-h-[80vh] items-center justify-center p-6 duration-500">
      <div className="w-full max-w-md rounded-2xl border border-amber-900/30 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigateTo('home')}>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-yellow-600 font-bold text-black text-sm">
              TC
            </div>
          </div>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          {mode === 'login' ? 'เข้าสู่ระบบ' : 'เริ่มต้นทดลองฟรี'}
        </h2>
        <p className="mb-8 text-center text-sm text-slate-400">
          {mode === 'login' ? 'ใส่อีเมลและรหัสผ่าน' : 'ทดลอง 1 เดือนฟรี ไม่ต้องจ่ายก่อน'}
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">อีเมล</label>
            <input
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-amber-900/30 bg-slate-950 px-4 py-2.5 text-white transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">รหัสผ่าน</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-amber-900/30 bg-slate-950 px-4 py-2.5 text-white transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {mode === 'login' && (
            <div className="flex justify-end">
              <a href="#" className="text-sm text-amber-400 hover:text-amber-300">
                ลืมรหัสผ่าน?
              </a>
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <Button className="mt-2 w-full py-3">
            {isSubmitting ? 'กรุณารอ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? (
            <>
              ยังไม่มีบัญชี?{' '}
              <button onClick={() => navigateTo('register')} className="text-amber-400 hover:underline">
                ทดลองฟรี
              </button>
            </>
          ) : (
            <>
              มีบัญชีอยู่แล้ว?{' '}
              <button onClick={() => navigateTo('login')} className="text-amber-400 hover:underline">
                เข้าสู่ระบบ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Navbar ────────────────────────────────────────────────────────────── */
function Navbar({
  navigateTo,
  currentPage,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: {
  navigateTo: (page: PageId) => void;
  currentPage: PageId;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: Array<{ id: PageId; label: string }> = [
    { id: 'home', label: 'หน้าแรก' },
    { id: 'features', label: 'ฟีเจอร์' },
    { id: 'workflow', label: 'วิธีใช้' },
    { id: 'pricing', label: 'ราคา' },
  ];

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'border-b border-amber-900/20 bg-[#050b1b]/85 py-3 backdrop-blur-md' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex cursor-pointer items-center gap-2.5" onClick={() => navigateTo('home')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-yellow-600 text-sm font-bold text-black">
            TC
          </div>
          <span className="text-[1.15rem] font-bold tracking-tight text-white">
            Trade<span className="text-amber-400">Candle</span>
          </span>
        </div>

        <div className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              className={`text-sm font-medium transition-colors ${
                currentPage === link.id ? 'text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Button variant="ghost" onClick={() => navigateTo('login')} className="px-4 text-sm font-semibold">
            เข้าสู่ระบบ
          </Button>
          <Button onClick={() => navigateTo('register')} className="rounded-xl px-7 py-3 text-sm font-semibold">
            ทดลองฟรี
          </Button>
        </div>

        <button className="text-slate-300 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 top-full flex w-full flex-col gap-4 border-b border-amber-900/20 bg-slate-900 p-6 shadow-2xl md:hidden">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              className="py-2 text-left text-lg font-medium text-slate-300 hover:text-white"
            >
              {link.label}
            </button>
          ))}
          <div className="my-2 h-px bg-slate-800" />
          <button onClick={() => navigateTo('login')} className="py-2 text-left text-lg font-medium text-slate-300">
            เข้าสู่ระบบ
          </button>
          <Button onClick={() => navigateTo('register')} className="mt-2 w-full rounded-xl">
            ทดลองฟรี
          </Button>
        </div>
      )}
    </nav>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */
function Footer({ navigateTo }: { navigateTo: (page: PageId) => void }) {
  return (
    <footer className="border-t border-amber-900/20 bg-slate-950 pb-8 pt-16">
      <div className="container mx-auto px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-yellow-600 text-xs font-bold text-black">
                TC
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Trade<span className="text-amber-400">Candle</span>
              </span>
            </div>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              AI เทรดทองคำอัตโนมัติ ปิดกำไรเป็น 3 คลื่น — 3-Wave Cashout + 6 Smart Money Filters บน MT5
            </p>
            <div className="flex gap-2">
              {['MT5', 'XAUUSD', 'SaaS', 'Thai'].map((item) => (
                <span
                  key={item}
                  className="rounded border border-amber-900/30 bg-amber-950/20 px-2 py-1 font-mono text-xs text-amber-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">สินค้า</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigateTo('features')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  ฟีเจอร์
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('workflow')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  วิธีใช้
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('pricing')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  ราคา
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">เข้าถึง</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigateTo('login')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  เข้าสู่ระบบ
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('register')} className="text-sm text-slate-400 transition-colors hover:text-white">
                  ทดลองฟรี
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-amber-900/20 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">© 2026 TradeCandle. All rights reserved.</p>
          <p className="text-xs text-slate-600">⚠️ Trading involves risk. Past performance does not guarantee future results.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── App Root ──────────────────────────────────────────────────────────── */
export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-slate-200 selection:bg-amber-500/30">
      <Navbar
        navigateTo={navigateTo}
        currentPage={currentPage}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="min-h-screen">
        {currentPage === 'home' && <HomePage navigateTo={navigateTo} />}
        {currentPage === 'features' && <FeaturesPage />}
        {currentPage === 'workflow' && <WorkflowPage />}
        {currentPage === 'pricing' && <PricingPage />}
        {currentPage === 'login' && <AuthPage mode="login" navigateTo={navigateTo} />}
        {currentPage === 'register' && <AuthPage mode="register" navigateTo={navigateTo} />}
      </main>

      <Footer navigateTo={navigateTo} />
    </div>
  );
}
