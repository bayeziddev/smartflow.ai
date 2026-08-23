import React from 'react';
import LegalLayout from '../../components/legal/LegalLayout.jsx';

export default function PaymentTermsPage() {
  return (
    <LegalLayout title="Payment Terms" lastUpdated="August 11, 2026" draft>
      <div className="rounded-xl border border-void-border bg-void-surface px-4 py-3 text-sm text-ink-muted">
        <strong className="text-ink">Where things stand today:</strong> registration is free, requires no
        payment method, and starts a 3-day trial. Paid plans and a payment processor aren't wired up yet
        — this page describes the terms that will apply once they are, so they're published before
        anyone is charged, not after.
      </div>

      <h2>Two kinds of cost</h2>
      <p>
        Using SmartGen involves two separate charges, from two separate parties:
      </p>
      <ul>
        <li>
          <strong>Your AI provider's usage cost</strong> — billed directly by OpenAI, Gemini, Groq, or
          Manus to your own account, using your own API key. We never see or mark up this cost; it
          doesn't pass through us at all.
        </li>
        <li>
          <strong>SmartGen's platform fee</strong> — for the routing, dashboard, and automation itself,
          once paid plans launch. This is the fee these terms will govern.
        </li>
      </ul>

      <h2>Trial</h2>
      <p>
        New accounts get 3 free days of the platform with no card on file. You won't be charged anything
        by SmartGen during the trial.
      </p>

      <h2>Billing (once live)</h2>
      <p>
        When paid plans launch, this section will specify: accepted payment methods, billing cycle
        (e.g. monthly), how upgrades/downgrades are handled, and what happens if a payment fails. None
        of that is active yet — you'll see updated terms and a clear notice before any card is charged.
      </p>

      <h2>Taxes</h2>
      <p>
        Once billing is live, prices shown will indicate whether applicable taxes are included or added
        at checkout, depending on your billing location.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about billing: <a href="mailto:support@smartgentools.com">support@smartgentools.com</a>.
      </p>
    </LegalLayout>
  );
}
