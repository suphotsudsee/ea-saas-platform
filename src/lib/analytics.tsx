// ─── Analytics Provider ──────────────────────────────────────────────────
// Google Analytics 4 + Facebook Pixel + Custom Events
// Initialized from env vars, SSR-safe, consent-ready
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import React, { useEffect, useCallback, createContext, useContext } from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

// ─── Event Types ─────────────────────────────────────────────────────────────

type AnalyticsEvent =
  | 'page_view'
  | 'sign_up'
  | 'login'
  | 'begin_checkout'
  | 'purchase'
  | 'add_to_cart'
  | 'view_item'
  | 'view_item_list'
  | 'subscribe'
  | 'trial_start'
  | 'trial_end'
  | 'license_activate'
  | 'ea_heartbeat'
  | 'kill_switch'
  | 'dashboard_view'
  | 'cta_click'
  | 'video_play'
  | 'line_add_friend'
  | 'contact';

interface AnalyticsContextType {
  trackEvent: (event: AnalyticsEvent | string, params?: Record<string, any>) => void;
  trackPageView: (url: string) => void;
  trackConversion: (value: number, currency?: string) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
  trackPageView: () => {},
  trackConversion: () => {},
  identify: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

// ─── GA4 Helper ─────────────────────────────────────────────────────────────

function ga4(...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag(...args);
  }
}

// ─── FB Pixel Helper ────────────────────────────────────────────────────────

function fbq(action: string, ...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq(action, ...args);
  }
}

// ─── Provider Component ─────────────────────────────────────────────────────

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Track page views on route change
  useEffect(() => {
    if (GA4_MEASUREMENT_ID) {
      ga4('config', GA4_MEASUREMENT_ID, {
        page_path: window.location.pathname,
        page_title: document.title,
      });
    }

    if (FB_PIXEL_ID) {
      fbq('track', 'PageView');
    }
  }, []);

  const trackEvent = useCallback((event: string, params?: Record<string, any>) => {
    // GA4 event
    if (GA4_MEASUREMENT_ID) {
      ga4('event', event, {
        ...params,
        send_to: GA4_MEASUREMENT_ID,
      });
    }

    // FB Pixel event mapping
    if (FB_PIXEL_ID) {
      const fbEventMap: Record<string, string> = {
        sign_up: 'CompleteRegistration',
        begin_checkout: 'InitiateCheckout',
        purchase: 'Purchase',
        subscribe: 'Subscribe',
        trial_start: 'StartTrial',
        add_to_cart: 'AddToCart',
        view_item: 'ViewContent',
        contact: 'Contact',
        cta_click: 'Subscribe',
        video_play: 'ViewContent',
        line_add_friend: 'AddToWishlist',
      };

      const fbEvent = fbEventMap[event] || event;
      fbq('track', fbEvent, params);
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, params);
    }
  }, []);

  const trackPageView = useCallback((url: string) => {
    if (GA4_MEASUREMENT_ID) {
      ga4('config', GA4_MEASUREMENT_ID, {
        page_path: url,
      });
    }

    if (FB_PIXEL_ID) {
      fbq('track', 'PageView');
    }
  }, []);

  const trackConversion = useCallback((value: number, currency: string = 'THB') => {
    // GA4 purchase/subscription conversion
    ga4('event', 'purchase', {
      value: value,
      currency: currency,
      transaction_id: `tc_${Date.now()}`,
    });

    // FB Pixel purchase
    fbq('track', 'Purchase', {
      value: value,
      currency: currency,
    });
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    // GA4 user ID
    ga4('config', GA4_MEASUREMENT_ID, {
      user_id: userId,
    });

    // GA4 user properties
    ga4('set', 'user_properties', {
      plan: traits?.plan || 'free',
      role: traits?.role || 'trader',
      ...traits,
    });

    // Console in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics Identify]', userId, traits);
    }
  }, []);

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackPageView, trackConversion, identify }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ─── Script Components ──────────────────────────────────────────────────────

export function GoogleAnalytics() {
  if (!GA4_MEASUREMENT_ID) return null;

  return (
    <>
      {/* Google Tag Manager (head) */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
              cookie_flags: 'SameSite=None;Secure',
              cookie_domain: 'tradecandle.ai',
            });
          `,
        }}
      />
    </>
  );
}

export function FacebookPixel() {
  if (!FB_PIXEL_ID) return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}

export function GoogleTagManagerHead() {
  if (!GTM_ID) return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `,
      }}
    />
  );
}

export function GoogleTagManagerBody() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}

// ─── Pre-built Tracking Hooks ───────────────────────────────────────────────

export function useTrackCTA() {
  const { trackEvent } = useAnalytics();

  return useCallback((ctaName: string, location: string) => {
    trackEvent('cta_click', {
      cta_name: ctaName,
      cta_location: location,
      page: window.location.pathname,
    });
  }, [trackEvent]);
}

export function useTrackSignup() {
  const { trackEvent, trackConversion } = useAnalytics();

  return useCallback((plan: string, userId: string) => {
    trackEvent('sign_up', {
      method: 'email',
      plan: plan,
      user_id: userId,
    });

    trackEvent('trial_start', {
      plan: plan,
      user_id: userId,
    });
  }, [trackEvent]);
}

export function useTrackPurchase() {
  const { trackEvent, trackConversion, identify } = useAnalytics();

  return useCallback((data: {
    plan: string;
    amount: number;
    currency?: string;
    userId: string;
    licenseKey?: string;
  }) => {
    trackEvent('purchase', {
      value: data.amount,
      currency: data.currency || 'THB',
      plan: data.plan,
      user_id: data.userId,
      license_key: data.licenseKey,
    });

    trackEvent('subscribe', {
      value: data.amount,
      currency: data.currency || 'THB',
      plan: data.plan,
    });

    trackConversion(data.amount, data.currency);
    identify(data.userId, { plan: data.plan });
  }, [trackEvent, trackConversion, identify]);
}

export function useTrackEA() {
  const { trackEvent } = useAnalytics();

  return useCallback((action: 'heartbeat' | 'kill_switch' | 'config_sync' | 'license_activate', data?: Record<string, any>) => {
    trackEvent(`ea_${action}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent]);
}