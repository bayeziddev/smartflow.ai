import React from 'react';
import LegalLayout from '../../components/legal/LegalLayout.jsx';

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="August 11, 2026" draft>
      <p>
        SmartGen currently offers a <strong>3-day free trial</strong> with no card required, so you can
        try the platform before any payment is involved. Our refund terms for paid plans, once billing
        goes live, are outlined below and will be finalized alongside the payment integration.
      </p>

      <h2>Free trial</h2>
      <p>
        Since the trial doesn't require a card or payment upfront, there's nothing to refund during
        those first 3 days — you simply won't be charged unless and until you choose to move to a paid
        plan.
      </p>

      <h2>Paid plans (once available)</h2>
      <p>
        Our intent is to offer a fair, short refund window for accidental or duplicate charges on paid
        plans. The exact window and eligibility rules will be published here before paid plans go live,
        so you know exactly what to expect before you're charged anything.
      </p>

      <h2>What we won't refund</h2>
      <p>
        Costs you've incurred directly with your own AI provider (OpenAI, Gemini, Groq, etc.) are
        outside our refund policy — those are billed by, and refundable through, that provider directly,
        since you're using your own key and your own account with them.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Once paid plans are live, email <a href="mailto:support@smartgentools.com">support@smartgentools.com</a> with
        your account email and the reason for the request, and we'll respond within a reasonable time.
      </p>
    </LegalLayout>
  );
}
