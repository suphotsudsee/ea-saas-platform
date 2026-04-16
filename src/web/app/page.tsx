import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl">
        <h1 className="text-6xl font-extrabold tracking-tight text-white mb-6">
          Scale Your <span className="text-blue-500">EA Business</span> With Precision
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          The all-in-one infrastructure for Expert Advisor licensing, risk management, 
          and performance tracking. Built for professional traders and developers.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Client Login
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full px-6">
        {[
          { title: 'Secure Licensing', desc: 'Cryptographically signed keys with hardware binding and multi-account control.', icon: '🔐' },
          { title: 'Real-time Risk', desc: 'Automatic kill-switches based on drawdown, daily loss, or consecutive trades.', icon: '📉' },
          { title: 'Advanced Analytics', desc: 'Deep dive into P&L, equity curves, and strategy performance across all accounts.', icon: '📊' },
        ].map((feature, i) => (
          <div key={i} className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-left">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-slate-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
