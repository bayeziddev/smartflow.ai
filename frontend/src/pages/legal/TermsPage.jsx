import React from 'react';
import LegalLayout from '../../components/legal/LegalLayout.jsx';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="August 11, 2026" draft>
      <p>
        These terms cover your use of SmartGen — a bring-your-own-key (BYOK) automation gateway that
        connects your messaging channels to an AI provider you control. By creating an account, you're
        agreeing to them.
      </p>

      <h2>The service</h2>
      <p>
        SmartGen routes messages between the channels you connect (WhatsApp, Telegram, Messenger,
        email) and the AI provider you configure with your own API key. We provide the routing,
        dashboard, and automation — you provide and pay for the AI usage directly with your chosen
        provider.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You're responsible for keeping your login credentials and connected API keys secure.</li>
        <li>You must be legally able to enter into these terms, and to use the messaging channels and AI providers you connect through us in your jurisdiction.</li>
        <li>You're responsible for how your account is used, including messages sent through channels you've connected.</li>
      </ul>

      <h2>Free trial</h2>
      <p>
        New accounts get a 3-day free trial of the platform, no card required. What happens at the end
        of the trial (feature limits, an upgrade prompt, etc.) will be detailed here once billing is
        finalized — see our <a href="/payment-terms">Payment Terms</a> for the current state of that.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don't use SmartGen to send spam, unsolicited bulk messages, or anything that violates the terms
        of the messaging platform (WhatsApp, Telegram, Messenger) or AI provider you've connected —
        those platforms' own rules still apply to what you send through them. We may suspend accounts
        that put the platform, other users, or our relationship with upstream providers at risk.
      </p>

      <h2>Your data and keys</h2>
      <p>
        Your AI provider keys and channel credentials remain yours. You can remove them, and disconnect
        channels, at any time from your dashboard. See our <a href="/privacy">Privacy Policy</a> for how
        we handle that data.
      </p>

      <h2>Service availability</h2>
      <p>
        We aim for high availability but don't guarantee uninterrupted service. We're not responsible
        for outages or issues originating from your AI provider or the messaging platforms themselves —
        those are third-party services outside our control.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the product evolves. Material changes will be announced with
        reasonable notice before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:support@smartgentools.com">support@smartgentools.com</a>.
      </p>
    </LegalLayout>
  );
}
