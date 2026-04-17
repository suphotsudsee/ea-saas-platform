import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'EA SaaS Platform — Licensing, Risk Management & Analytics for Expert Advisors',
  description: 'The all-in-one infrastructure for Expert Advisor licensing, real-time risk management, and performance analytics. Deploy, monitor, and monetize your trading strategies with enterprise-grade security.',
  keywords: ['EA', 'Expert Advisor', 'MT4', 'MT5', 'MetaTrader', 'trading', 'licensing', 'risk management', 'SaaS'],
  openGraph: {
    title: 'EA SaaS Platform — Scale Your EA Business With Precision',
    description: 'Enterprise-grade licensing, risk management, and analytics for MetaTrader Expert Advisors.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-[#0a0e1a] text-slate-50 antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}