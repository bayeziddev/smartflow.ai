import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { submitLead } from '../../services/api.js';

/**
 * A lighter ask than registration — for visitors who aren't ready to
 * create an account yet. `source` tags where on the site this was
 * submitted from (see leads.source in the backend), so it's clear
 * later which placement actually gets used.
 */
export default function LeadCaptureForm({ source = 'footer' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      await submitLead(email, source);
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <p className="flex items-center gap-2 text-sm text-wire-on">
        <Check className="h-4 w-4" />
        You're on the list — we'll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="field-input !py-2 text-sm"
      />
      <button type="submit" disabled={status === 'loading'} className="btn-ghost shrink-0 !py-2 !px-4 text-sm disabled:opacity-60">
        {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get updates'}
      </button>
      {status === 'error' && <p className="text-xs text-rose sm:hidden">Something went wrong — try again.</p>}
    </form>
  );
}
