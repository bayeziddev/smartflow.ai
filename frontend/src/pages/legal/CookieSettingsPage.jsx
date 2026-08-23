import React, { useState } from 'react';
import { Check } from 'lucide-react';
import LegalLayout from '../../components/legal/LegalLayout.jsx';
import { useCookieConsent } from '../../context/CookieConsentContext.jsx';

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-signal' : 'bg-void-border'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function CookieSettingsPage() {
  const { consent, savePreferences } = useCookieConsent();
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    savePreferences({ analytics });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <LegalLayout title="Cookie Settings" lastUpdated="August 11, 2026">
      <p>
        Two categories exist today. Choose what you're comfortable with — this only affects your
        browser, and you can change it here any time.
      </p>

      <div className="not-prose mt-8 space-y-4">
        <div className="panel flex items-start justify-between gap-4 p-5">
          <div>
            <h3 className="font-display text-sm font-semibold text-ink">Essential</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Keeps you signed in between page loads. Required for the dashboard to work — this can't
              be turned off.
            </p>
          </div>
          <Toggle checked disabled onChange={() => {}} />
        </div>

        <div className="panel flex items-start justify-between gap-4 p-5">
          <div>
            <h3 className="font-display text-sm font-semibold text-ink">Analytics</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Would help us understand product usage. <strong>Honest status:</strong> no analytics
              provider is wired into SmartGen yet, so this toggle doesn't currently send data anywhere —
              it's here so your preference is on record before it does.
            </p>
          </div>
          <Toggle checked={analytics} onChange={setAnalytics} />
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary mt-8">
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          'Save preferences'
        )}
      </button>
    </LegalLayout>
  );
}
