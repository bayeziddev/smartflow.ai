import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Logo from '../shared/Logo.jsx';
import LeadCaptureForm from '../shared/LeadCaptureForm.jsx';

const LINK_GROUPS = [
  {
    heading: 'Product',
    links: [
      { to: '/guide', label: 'Guide' },
      { to: '/register', label: 'Get started' },
      { to: '/login', label: 'Sign in' },
    ],
  },
  {
    heading: 'Trust',
    links: [
      { to: '/trust-centre', label: 'Trust Centre' },
      { to: '/cookie-settings', label: 'Cookie Settings' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Service' },
      { to: '/refund-policy', label: 'Refund Policy' },
      { to: '/payment-terms', label: 'Payment Terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-void-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="panel flex flex-col items-center gap-5 p-10 text-center sm:p-14">
          <h2 className="max-w-md text-2xl font-semibold text-ink sm:text-3xl">
            Your AI budget, your control. Just point it at your customers.
          </h2>
          <Link to="/register" className="btn-primary">
            Connect your first channel
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-2 w-full max-w-sm border-t border-void-border pt-5">
            <p className="mb-3 text-xs text-ink-faint">Not ready yet? Get occasional updates instead.</p>
            <LeadCaptureForm source="footer" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <Logo size={24} wordmarkClassName="text-sm" />
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              BYOK automation gateway — WhatsApp, Telegram, Messenger, Email.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{group.heading}</h3>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-void-border pt-6 text-center text-xs text-ink-faint">
          <p>© {new Date().getFullYear()} SmartGen. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
