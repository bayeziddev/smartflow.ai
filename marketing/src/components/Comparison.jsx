import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const ROWS = [
  { label: 'Billing model', them: 'Monthly, scales with contacts', us: 'One-time payment' },
  { label: 'Cost as your audience grows', them: 'Goes up every tier', us: 'Never changes' },
  { label: 'Bring your own AI key', them: 'Rarely supported', us: 'Built in from day one' },
  { label: 'WhatsApp, Messenger, Telegram, Email', them: 'Often one or two only', us: 'All four included' },
  { label: 'Automatic provider failover', them: 'Not available', us: 'Included' },
  { label: 'Order capture to Excel', them: 'Manual export, if at all', us: 'One click' },
];

export default function Comparison() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="eyebrow text-signal">The honest comparison</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Most chatbot platforms charge you more as you succeed.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-muted">
            The more customers message you, the more a typical contact-based platform costs.
            SmartFlow AI doesn't do that.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="panel overflow-hidden"
        >
          <div className="grid grid-cols-3 border-b border-void-border bg-void-elevated/50 text-sm font-semibold">
            <div className="px-5 py-4 text-ink-muted">Feature</div>
            <div className="px-5 py-4 text-ink-muted">Typical platforms</div>
            <div className="px-5 py-4 text-signal">SmartFlow AI</div>
          </div>
          {ROWS.map((row, i) => (
            <div key={row.label} className={`grid grid-cols-3 text-sm ${i % 2 ? 'bg-void-elevated/20' : ''}`}>
              <div className="px-5 py-4 text-ink">{row.label}</div>
              <div className="flex items-start gap-2 px-5 py-4 text-ink-faint">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose/70" />
                {row.them}
              </div>
              <div className="flex items-start gap-2 px-5 py-4 text-ink-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-wire-on" />
                {row.us}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
