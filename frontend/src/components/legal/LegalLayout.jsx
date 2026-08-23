import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LandingNav from '../landing/LandingNav.jsx';
import Footer from '../landing/Footer.jsx';

/**
 * Shared shell for long-form legal/policy pages. `draft` renders a
 * banner making clear this hasn't had legal review — every page under
 * pages/legal/ except Trust Centre (which is a factual description of
 * practices, not a legal document) should pass this.
 */
export default function LegalLayout({ title, lastUpdated, draft = false, children }) {
  return (
    <div className="min-h-screen">
      <LandingNav />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {lastUpdated && <p className="mt-2 text-sm text-ink-faint">Last updated: {lastUpdated}</p>}

        {draft && (
          <div className="mt-6 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
            <strong className="font-semibold">Draft — not yet reviewed by a lawyer.</strong> This page
            describes our intended policy in plain language, but hasn't had formal legal review. Don't
            treat it as a final, binding legal document until that review is complete.
          </div>
        )}

        <div className="prose-legal mt-10 space-y-6 text-sm leading-relaxed text-ink-muted [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-signal [&_a]:hover:underline [&_strong]:text-ink">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
