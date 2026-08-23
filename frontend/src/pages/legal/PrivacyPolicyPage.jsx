import React from 'react';
import LegalLayout from '../../components/legal/LegalLayout.jsx';

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="August 11, 2026" draft>
      <p>
        SmartGen ("we", "us") builds a bring-your-own-key (BYOK) automation gateway that connects
        WhatsApp, Telegram, Messenger, and email to an AI provider of your choosing. This page
        explains what we collect, why, and what we do — and don't do — with it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> full name, company name (optional), email address, and
          a hashed password when you register.
        </li>
        <li>
          <strong>Your AI provider keys:</strong> API keys you add for OpenAI, Gemini, Groq, or a Manus
          connection. These are encrypted at rest (AES-256-GCM) before they ever touch our database —
          see our <a href="/trust-centre">Trust Centre</a> for how this works.
        </li>
        <li>
          <strong>Channel credentials:</strong> access tokens and identifiers for the messaging channels
          you connect (e.g. a WhatsApp Business phone number ID), also encrypted at rest.
        </li>
        <li>
          <strong>Conversation and order data:</strong> messages routed through your connected channels,
          and any order records the system creates on your behalf, so you can see them in your
          dashboard.
        </li>
        <li>
          <strong>Basic usage data:</strong> the essential cookies needed to keep you signed in. See our{' '}
          <a href="/cookie-settings">Cookie Settings</a> for what else, if anything, is active.
        </li>
      </ul>

      <h2>What we don't do</h2>
      <ul>
        <li>We don't sell your data, your customers' data, or your AI provider keys to anyone.</li>
        <li>
          We don't route your messages through any AI key except the one you explicitly connected —
          there's no shared or platform-wide key silently standing in for yours.
        </li>
        <li>We don't share your conversation data with third parties beyond what's needed to deliver the service (e.g. the AI provider you chose, and the messaging platform itself).</li>
      </ul>

      <h2>Why we collect it</h2>
      <p>
        To operate your account, route messages to and from your connected channels and AI provider,
        show you your conversations and orders, and — where you've told us it's okay — reach you about
        your account or the service.
      </p>

      <h2>How long we keep it</h2>
      <p>
        For as long as your account is active. If you delete your account, we remove your stored keys,
        channel credentials, and personal information within a reasonable period, except where we're
        required to keep records for legal or accounting reasons.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us to access, correct, or delete your personal data at any time by contacting{' '}
        <a href="mailto:support@smartgentools.com">support@smartgentools.com</a>. Depending on where you
        live, you may have additional rights under laws like GDPR or CCPA — this section will be
        expanded with jurisdiction-specific detail as part of the legal review mentioned above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href="mailto:support@smartgentools.com">support@smartgentools.com</a>.
      </p>
    </LegalLayout>
  );
}
