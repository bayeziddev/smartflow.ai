import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'smartgen_cookie_consent';

// Only two categories exist right now. "essential" can't be turned off —
// it's the auth token that keeps you signed in, not a tracking cookie.
// "analytics" is a placeholder: no analytics provider is wired into the
// app yet, so toggling it currently does nothing observable — it's here
// so the choice is captured up front, before any analytics ships.
const DEFAULT_PREFS = { essential: true, analytics: false };

const CookieConsentContext = createContext(null);

function readStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { essential: true, analytics: !!parsed.analytics, decidedAt: parsed.decidedAt };
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readStoredConsent());

  useEffect(() => {
    if (consent) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    }
  }, [consent]);

  function saveConsent(prefs) {
    setConsent({ ...DEFAULT_PREFS, ...prefs, decidedAt: new Date().toISOString() });
  }

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        hasDecided: !!consent,
        acceptAll: () => saveConsent({ analytics: true }),
        essentialOnly: () => saveConsent({ analytics: false }),
        savePreferences: (prefs) => saveConsent(prefs),
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}
