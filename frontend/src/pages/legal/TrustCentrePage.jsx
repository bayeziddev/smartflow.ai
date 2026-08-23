import React from 'react';
import { ShieldCheck, Lock, KeyRound, Server } from 'lucide-react';
import LegalLayout from '../../components/legal/LegalLayout.jsx';

const PRACTICES = [
  {
    icon: KeyRound,
    title: 'Your AI keys never route through anyone else’s',
    body: "This is the whole premise of SmartGen: you connect your own OpenAI, Gemini, Groq, or Manus key, and only your messages, on your channels, ever use it. There's no shared platform key silently standing in.",
  },
  {
    icon: Lock,
    title: 'Keys and channel credentials are encrypted at rest',
    body: 'API keys and messaging channel credentials (e.g. WhatsApp access tokens) are encrypted with AES-256-GCM before they’re stored — not kept as plain text in the database.',
  },
  {
    icon: Server,
    title: 'Encrypted connection to the database',
    body: 'The backend connects to its database over TLS (minimum TLS 1.2, certificate verification on), the same standard used for banking and payment traffic.',
  },
  {
    icon: ShieldCheck,
    title: 'Passwords are hashed, never stored in plain text',
    body: 'Account passwords are hashed (bcrypt) before storage. Nobody at SmartGen — including us — can read your actual password.',
  },
];

export default function TrustCentrePage() {
  return (
    <LegalLayout title="Trust Centre" lastUpdated="August 11, 2026">
      <p>
        This page describes, in plain terms, the actual security practices built into SmartGen today —
        not aspirational claims. If something here stops being true, we'll update this page.
      </p>

      <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
        {PRACTICES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="panel p-5">
            <Icon className="h-5 w-5 text-signal" />
            <h3 className="mt-3 font-display text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
          </div>
        ))}
      </div>

      <h2>What this doesn't cover (yet)</h2>
      <p>
        We haven't undergone a formal third-party security audit or compliance certification (e.g. SOC
        2). If that matters for your use case, reach out and we'll tell you honestly where things stand.
      </p>

      <h2>Reporting a security issue</h2>
      <p>
        Found a vulnerability? Please email{' '}
        <a href="mailto:support@smartgentools.com">support@smartgentools.com</a> with details before
        disclosing it publicly — we'll respond and work with you on a fix.
      </p>

      <h2>Related pages</h2>
      <p>
        See our <a href="/privacy">Privacy Policy</a> for what data we collect and why.
      </p>
    </LegalLayout>
  );
}
