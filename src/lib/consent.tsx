// ─── Consent Management ──────────────────────────────────────────────────
// GDPR/CCPA-compliant cookie consent banner + preference management
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsentPreferences {
  analytics: boolean; // GA4, FB Pixel
  marketing: boolean; // FB Ads, retargeting
  functional: boolean; // chat, dashboard features
}

interface ConsentContextType {
  consent: ConsentPreferences | null;
  hasConsented: boolean;
  updateConsent: (prefs: ConsentPreferences) => void;
  revokeConsent: () => void;
}

const DEFAULT_CONSENT: ConsentPreferences = {
  analytics: true,
  marketing: true,
  functional: true,
};

const CONSENT_KEY = 'tc_consent_prefs';
const CONSENT_VERSION = '1';

const ConsentContext = createContext<ConsentContextType>({
  consent: null,
  hasConsented: false,
  updateConsent: () => {},
  revokeConsent: () => {},
});

export const useConsent = () => useContext(ConsentContext);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Load saved consent
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed.preferences);
          return;
        }
      } catch {}
    }
    // No consent saved — show banner
    setShowBanner(true);
  }, []);

  const updateConsent = useCallback((prefs: ConsentPreferences) => {
    const data = {
      version: CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    setConsent(prefs);
    setShowBanner(false);

    // Update dataLayer for GTM
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'consent_update',
        consent: prefs,
      });
    }
  }, []);

  const revokeConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsent(null);
    setShowBanner(true);
  }, []);

  return (
    <ConsentContext.Provider value={{
      consent,
      hasConsented: consent !== null,
      updateConsent,
      revokeConsent,
    }}>
      {children}
      {showBanner && (
        <ConsentBanner onAccept={updateConsent} />
      )}
    </ConsentContext.Provider>
  );
}

// ─── Consent Banner ─────────────────────────────────────────────────────────

function ConsentBanner({ onAccept }: { onAccept: (prefs: ConsentPreferences) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPreferences>({ ...DEFAULT_CONSENT });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#D4AF37]/30 bg-[#111118]/95 backdrop-blur-lg shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">🍪</div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">
              We Use Cookies to Improve Your Experience
            </h3>
            <p className="text-gray-400 text-sm">
              Cookies help us analyze usage, optimize ads, and deliver better services.
            </p>
          </div>
        </div>

        {/* Detail toggles */}
        {showDetails && (
          <div className="space-y-3 mb-4 pl-10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.functional}
                disabled
                className="w-4 h-4 rounded border-gray-600 accent-[#D4AF37]"
              />
              <div>
                <span className="text-white text-sm font-medium">Functional</span>
                <span className="text-gray-500 text-xs ml-2">Required — cannot be disabled</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(e) => setPrefs(p => ({ ...p, analytics: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 accent-[#D4AF37]"
              />
              <div>
                <span className="text-white text-sm font-medium">Analytics</span>
                <span className="text-gray-500 text-xs ml-2">Google Analytics — helps us understand usage</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.marketing}
                onChange={(e) => setPrefs(p => ({ ...p, marketing: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 accent-[#D4AF37]"
              />
              <div>
                <span className="text-white text-sm font-medium">Marketing</span>
                <span className="text-gray-500 text-xs ml-2">Facebook Pixel — improves ad targeting</span>
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pl-10">
          <button
            onClick={() => onAccept(DEFAULT_CONSENT)}
            className="px-5 py-2.5 bg-[#D4AF37] text-[#0A0A0A] font-bold rounded-lg hover:bg-[#F5C842] transition-colors text-sm"
          >
            Accept All
          </button>
          <button
            onClick={() => {
              if (showDetails) {
                onAccept(prefs);
              } else {
                setShowDetails(true);
              }
            }}
            className="px-5 py-2.5 border border-[#D4AF37]/50 text-[#D4AF37] font-medium rounded-lg hover:bg-[#D4AF37]/10 transition-colors text-sm"
          >
            {showDetails ? 'Save Settings' : 'Customize'}
          </button>
          <button
            onClick={() => onAccept({ analytics: false, marketing: false, functional: true })}
            className="px-5 py-2.5 text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Consent Gate ──────────────────────────────────────────────────
// Only fire analytics events when user has consented

export function useConsentedAnalytics() {
  const { consent } = useConsent();
  const analytics = useContext(ConsentContext); // Re-import for tracking

  return {
    canTrackAnalytics: consent?.analytics ?? false,
    canTrackMarketing: consent?.marketing ?? false,
  };
}