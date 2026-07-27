import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown } from 'lucide-react';
import { fbTrack } from '../fbPixel.js';

const LIFETIME_FEATURES = [
  'Unlimited conversations \u2014 your own AI key, not ours',
  'WhatsApp, Messenger, Telegram & Email included',
  'Automatic failover across 4 AI providers',
  'Encrypted key storage, masked forever',
  'Order capture + one-click Excel export',
  'Free updates for life',
];

const MONTHLY_FEATURES = [
  'Everything in Lifetime',
  'Priority support',
  'Early access to new channels',
];

export default function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="eyebrow text-gold">Limited-time pricing</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">Pay once. Own it forever.</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            No per-contact fees. No pricing tier that climbs as your audience grows.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="panel relative overflow-hidden border-gold/40 p-8"
          >
            <span className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
              <Crown className="h-3.5 w-3.5" /> Best value
            </span>
            <p className="eyebrow text-gold">Lifetime</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-semibold text-ink">$XX</span>
              <span className="mb-1 text-sm text-ink-faint line-through">$XXX</span>
              <span className="mb-1.5 text-sm text-ink-muted">one-time</span>
            </div>
            <ul className="mt-6 space-y-3">
              {LIFETIME_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-wire-on" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => fbTrack('InitiateCheckout', { content_name: 'lifetime_plan' })}
              className="btn-gold mt-8 w-full"
            >
              Get Lifetime Access
            </button>
            <p className="mt-3 text-center text-[11px] text-ink-faint">
              Edit the price and % savings above once you've set your rate.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="panel p-8"
          >
            <p className="eyebrow text-signal">Monthly</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-semibold text-ink">$X</span>
              <span className="mb-1.5 text-sm text-ink-muted">/ month</span>
            </div>
            <ul className="mt-6 space-y-3">
              {MONTHLY_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-wire-on" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => fbTrack('InitiateCheckout', { content_name: 'monthly_plan' })}
              className="btn-ghost mt-8 w-full"
            >
              Start Monthly Plan
            </button>
          </motion.div>
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-xs text-ink-faint">
          You still pay your own AI provider (OpenAI, Gemini, Groq, Manus) directly for usage \u2014
          this price is for the platform itself, not your token costs.
        </p>
      </div>
    </section>
  );
}
