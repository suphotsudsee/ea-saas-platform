import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { AnalyticsProvider, GoogleAnalytics, FacebookPixel, GoogleTagManagerHead, GoogleTagManagerBody } from '@/lib/analytics';
import { ConsentProvider } from '@/lib/consent';
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
  title: 'TradeCandle v11 — AI เทรดทองอัตโนมัติ | 3-Wave Cashout + Smart Money Filters',
  description: 'AI Expert Advisor สำหรับ XAUUSD บน MT5 — ปิดกำไรเป็น 3 คลื่น, 6 Smart Money Filters, Dashboard คุมจากมือถือ, Kill Switch หยุดทันที ทดลอง 7 วันฟรี',
  keywords: ['EA', 'Expert Advisor', 'XAUUSD', 'ทอง', 'Gold Trading', 'MT5', 'MetaTrader', 'Smart Money', 'SMC', '3-Wave Cashout', 'TradeCandle', 'เทรดทอง', 'AI Trading'],
  icons: {
    icon: '/images/icon-512.svg',
    apple: '/images/icon-512.svg',
  },
  openGraph: {
    title: 'TradeCandle v11 — AI เทรดทองอัตโนมัติ',
    description: '3-Wave Cashout ปิดกำไรเป็น 3 รอบ + 6 Smart Money Filters อ่านทรงสตรัคเจอร์อัตโนมัติ | ทดลอง 7 วันฟรี',
    type: 'website',
    url: 'https://tradecandle.ai',
    siteName: 'TradeCandle',
    images: [
      {
        url: '/images/hero-banner.html',
        width: 1920,
        height: 1080,
        alt: 'TradeCandle v11 — AI Gold Trading',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeCandle v11 — AI เทรดทองอัตโนมัติ',
    description: '3-Wave Cashout + Smart Money Filters | ทดลอง 7 วันฟรี',
    images: ['/images/hero-banner.html'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <head>
        {/* Google Tag Manager — head script */}
        <GoogleTagManagerHead />
        {/* Google Analytics 4 */}
        <GoogleAnalytics />
        {/* Facebook Pixel */}
        <FacebookPixel />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-[#0a0e1a] text-slate-50 antialiased`}>
        {/* Google Tag Manager — noscript fallback */}
        <GoogleTagManagerBody />
        <AuthProvider>
          <ConsentProvider>
            <AnalyticsProvider>
              {children}
            </AnalyticsProvider>
          </ConsentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}