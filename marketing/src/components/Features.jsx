import React from 'react';
import { motion } from 'framer-motion';
import { Lock, GitBranch, FileSpreadsheet, Radio, ShieldCheck } from 'lucide-react';

function LockVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="flex h-full items-center justify-center"
    >
      <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl border border-signal/40 bg-void shadow-glow-signal">
        <Lock className="h-10 w-10 text-signal" strokeWidth={1.5} />
        <motion.span
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-wire-on text-void"
        >
          <ShieldCheck className="h-4 w-4" />
        </motion.span>
      </div>
    </motion.div>
  );
}

function FailoverVisual() {
  const nodes = ['OpenAI', 'Groq', 'Gemini'];
  return (
    <div className="flex h-full items-center justify-center gap-3">
      {nodes.map((n, i) => (
        <motion.div
          key={n}
          initial={{ opacity: 0.3, y: 6 }}
          whileInView={{ opacity: i === 1 ? 1 : 0.4, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
          className={`rounded-xl border px-3 py-4 text-center text-xs font-mono ${
            i === 1 ? 'border-wire-on bg-void-elevated text-wire-on' : 'border-void-border text-ink-faint'
          }`}
        >
          {n}
          {i === 1 && <div className="mt-1 text-[10px] uppercase tracking-wide">active</div>}
        </motion.div>
      ))}
    </div>
  );
}

function ExcelVisual() {
  const rows = ['Cold Coffee \u00d72', 'Wireless Mic \u00d71', 'T-Shirt (L) \u00d73'];
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-4">
      {rows.map((r, i) => (
        <motion.div
          key={r}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12 }}
          className="flex items-center gap-2 rounded-lg border border-void-border bg-void px-3 py-2 text-xs text-ink-muted"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-wire-on" />
          {r}
        </motion.div>
      ))}
    </div>
  );
}

function ChannelsVisual() {
  const channels = ['WhatsApp', 'Messenger', 'Telegram', 'Email'];
  return (
    <div className="grid h-full grid-cols-2 gap-2 p-2">
      {channels.map((c, i) => (
        <motion.div
          key={c}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center justify-center rounded-xl border border-void-border bg-void text-xs text-ink-muted"
        >
          {c}
        </motion.div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    Icon: Lock,
    title: 'Your keys, encrypted, never shown twice',
    body: 'Paste your OpenAI, Gemini, Groq or Manus key once. It\u2019s AES-256 encrypted immediately \u2014 masked from that point on, even from you.',
    Visual: LockVisual,
  },
  {
    Icon: GitBranch,
    title: 'One provider goes down, another takes over',
    body: 'Rate-limited on OpenAI? Traffic quietly shifts to your backup provider mid-conversation. Customers never see the gap.',
    Visual: FailoverVisual,
  },
  {
    Icon: Radio,
    title: 'Every channel your customers use',
    body: 'WhatsApp, Messenger, Telegram, Email \u2014 one AI brain, answering wherever the conversation starts.',
    Visual: ChannelsVisual,
  },
  {
    Icon: FileSpreadsheet,
    title: 'Confirmed orders, not just chat logs',
    body: 'When a customer says yes, the order is extracted and saved automatically \u2014 export the lot to Excel any time.',
    Visual: ExcelVisual,
  },
];

export default function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 max-w-xl">
          <p className="eyebrow text-signal">What you're actually buying</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Not a chat widget. A router with your name on it.
          </h2>
        </div>

        <div className="space-y-20">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-void-elevated text-signal">
                  <f.Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-2xl font-semibold text-ink">{f.title}</h3>
                <p className="mt-3 text-ink-muted">{f.body}</p>
              </motion.div>

              <div className="panel h-56">
                <f.Visual />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
