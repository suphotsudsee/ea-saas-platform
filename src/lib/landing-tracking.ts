// ─── Landing Page Tracking ──────────────────────────────────────────────────
// Convenience hooks for tracking events on the landing page
// These map directly to the CTA buttons and user flows in page.tsx
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useCallback } from 'react';
import { useAnalytics } from './analytics';
import { useConsent } from './consent';

// ─── Landing Page CTA Tracking ──────────────────────────────────────────────

export function useLandingTracking() {
  const { trackEvent, trackPageView, trackConversion } = useAnalytics();
  const { consent } = useConsent();

  const canTrack = consent?.analytics ?? true; // Default to true if no consent system

  // Hero CTA: "ทดลอง 1 เดือนฟรี" button
  const trackHeroCTA = useCallback(() => {
    if (!canTrack) return;
    trackEvent('cta_click', {
      cta_name: 'hero_free_trial',
      cta_location: 'hero_section',
      page: '/landing',
    });
  }, [canTrack, trackEvent]);

  // Pricing CTA: Click on any pricing tier
  const trackPricingCTA = useCallback((plan: string) => {
    if (!canTrack) return;
    trackEvent('cta_click', {
      cta_name: `pricing_${plan}`,
      cta_location: 'pricing_section',
      plan: plan,
      page: '/landing',
    });
    trackEvent('begin_checkout', {
      plan: plan,
      value: plan === 'starter' ? 990 : plan === 'pro' ? 2490 : 4990,
      currency: 'THB',
    });
  }, [canTrack, trackEvent]);

  // FAQ CTA: Click "เริ่มต้น" from FAQ
  const trackFAQCTA = useCallback(() => {
    if (!canTrack) return;
    trackEvent('cta_click', {
      cta_name: 'faq_cta',
      cta_location: 'faq_section',
      page: '/landing',
    });
  }, [canTrack, trackEvent]);

  // Feature section scroll
  const trackFeatureScroll = useCallback((feature: string) => {
    if (!canTrack) return;
    trackEvent('view_item', {
      item_name: feature,
      item_category: 'feature',
      page: '/landing',
    });
  }, [canTrack, trackEvent]);

  // Video play
  const trackVideoPlay = useCallback((videoName: string) => {
    if (!canTrack) return;
    trackEvent('video_play', {
      video_name: videoName,
      page: '/landing',
    });
  }, [canTrack, trackEvent]);

  // Line OA button click
  const trackLineClick = useCallback(() => {
    if (!canTrack) return;
    trackEvent('line_add_friend', {
      page: '/landing',
    });
  }, [canTrack, trackEvent]);

  // Contact/Support click
  const trackContactClick = useCallback((method: string) => {
    if (!canTrack) return;
    trackEvent('contact', {
      contact_method: method,
      page: '/landing',
    });
  }, [canTrack, trackEvent]);

  return {
    trackHeroCTA,
    trackPricingCTA,
    trackFAQCTA,
    trackFeatureScroll,
    trackVideoPlay,
    trackLineClick,
    trackContactClick,
  };
}

// ─── Dashboard Tracking ──────────────────────────────────────────────────────

export function useDashboardTracking() {
  const { trackEvent, identify } = useAnalytics();
  const { consent } = useConsent();
  const canTrack = consent?.analytics ?? true;

  const trackDashboardView = useCallback((section: string) => {
    if (!canTrack) return;
    trackEvent('dashboard_view', {
      section: section,
    });
  }, [canTrack, trackEvent]);

  const trackKillSwitch = useCallback((action: 'activate' | 'deactivate', accountId?: string) => {
    if (!canTrack) return;
    trackEvent('kill_switch', {
      action,
      account_id: accountId,
    });
  }, [canTrack, trackEvent]);

  return { trackDashboardView, trackKillSwitch };
}

// ─── Conversion Tracking for Stripe ──────────────────────────────────────────

export function useConversionTracking() {
  const { trackEvent, trackConversion, identify } = useAnalytics();

  const trackCheckoutStart = useCallback((plan: string) => {
    trackEvent('begin_checkout', {
      plan,
      currency: 'THB',
    });
  }, [trackEvent]);

  const trackPurchaseComplete = useCallback((data: {
    plan: string;
    amount: number;
    currency?: string;
    userId: string;
    licenseKey: string;
  }) => {
    trackEvent('purchase', {
      value: data.amount,
      currency: data.currency || 'THB',
      plan: data.plan,
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

  const trackTrialStart = useCallback((data: {
    plan: string;
    userId: string;
  }) => {
    trackEvent('trial_start', {
      plan: data.plan,
      user_id: data.userId,
    });

    trackEvent('sign_up', {
      method: 'trial',
      plan: data.plan,
    });
  }, [trackEvent]);

  return { trackCheckoutStart, trackPurchaseComplete, trackTrialStart };
}