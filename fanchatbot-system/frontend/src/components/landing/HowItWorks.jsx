import React from 'react';
import { motion } from 'framer-motion';
import { Plug, KeyRound, MessagesSquare, FileSpreadsheet } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    Icon: Plug,
    title: 'Connect a channel',
    body: 'Toggle on WhatsApp, Telegram, Messenger or Email from your dashboard. WhatsApp connects by scanning a QR code, same as linking a new device.',
  },
  {
    n: '02',
    Icon: KeyRound,
    title: 'Add your own key',
    body: 'Paste your OpenAI, Gemini, Groq or Manus key. It\u2019s AES-256 encrypted before it touches the database, and shown back to you masked from that point on.',
  },
  {
    n: '03',
    Icon: MessagesSquare,
    title: 'Messages get answered',
    body: 'Every reply runs on your key. If a provider rate-limits or rejects a request, the router quietly fails over to the next one you\u2019ve configured.',
  },
  {
    n: '04',
    Icon: FileSpreadsheet,
    title: 'Orders land in one sheet',
    body: 'When a customer confirms an order, the AI extracts the items into a structured record. Export the lot to Excel whenever you need it.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 max-w-lg">
          <p className="text-xs font-medium uppercase tracking-wider text-signal">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Four steps between "connect" and "confirmed order."
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-void-border bg-void-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-void-surface p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ink-faint">{step.n}</span>
                <step.Icon className="h-4 w-4 text-intel" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
