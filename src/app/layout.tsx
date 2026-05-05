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
  title: 'TradeCandle v12 — AI Automated Gold Trading | 3-Wave Cashout + Smart Money Filters',
  description: 'AI Expert Advisor for XAUUSD on MT5 — Close profit in 3 waves, 6 Smart Money Filters, Mobile Dashboard Control, Instant Kill Switch. Try 1 month free',
  keywords: ['EA', 'Expert Advisor', 'XAUUSD', 'Gold', 'Gold Trading', 'MT5', 'MetaTrader', 'Smart Money', 'SMC', '3-Wave Cashout', 'TradeCandle', 'Gold Trading', 'AI Trading'],
  icons: {
    icon: '/images/icon-512.svg',
    apple: '/images/icon-512.svg',
  },
  openGraph: {
    title: 'TradeCandle v12 — AI Automated Gold Trading',
    description: '3-Wave Cashout: Close profit in 3 rounds + 6 Smart Money Filters with Auto Structure Detection | Try 1 month free',
    type: 'website',
    url: 'https://tradecandle.ai',
    siteName: 'TradeCandle',
    images: [
      {
        url: '/images/hero-banner.html',
        width: 1920,
        height: 1080,
        alt: 'TradeCandle v12 — AI Gold Trading',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeCandle v12 — AI Automated Gold Trading',
    description: '3-Wave Cashout + Smart Money Filters | Try 1 month free',
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
    <html lang="en" className="dark">
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