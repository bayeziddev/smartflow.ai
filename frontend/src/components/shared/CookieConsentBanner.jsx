import React from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext.jsx';

export default function CookieConsentBanner() {
  const { hasDecided, acceptAll, essentialOnly } = useCookieConsent();

  if (hasDecided) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="panel mx-auto flex max-w-3xl flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <Cookie className="hidden h-6 w-6 shrink-0 text-intel sm:block" />
        <p className="flex-1 text-sm text-ink-muted">
          We use essential cookies to keep you signed in. We'd also like your OK to use analytics
          cookies to understand product usage — see our{' '}
          <Link to="/cookie-settings" className="text-signal hover:underline">
            Cookie Settings
          </Link>{' '}
          for details.
        </p>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button onClick={essentialOnly} className="btn-ghost flex-1 !py-2 !px-4 text-sm sm:flex-none">
            Essential only
          </button>
          <button onClick={acceptAll} className="btn-primary flex-1 !py-2 !px-4 text-sm sm:flex-none">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
