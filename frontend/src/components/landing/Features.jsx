import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, GitBranch, Cpu, FileSpreadsheet, Bell, Lock } from 'lucide-react';

const FEATURES = [
  {
    Icon: Lock,
    title: 'Your keys stay yours',
    body: 'Every key is AES-256-GCM encrypted at rest and masked the moment it\u2019s saved. No screen, log, or API response ever shows it again.',
  },
  {
    Icon: GitBranch,
    title: 'Automatic failover',
    body: 'OpenAI rate-limited? Traffic quietly shifts to Groq\u2019s LLaMA 3.1, Gemini, or Manus \u2014 whichever you\u2019ve got configured, in the order you set.',
  },
  {
    Icon: ShieldCheck,
    title: 'WhatsApp that can\u2019t take you down',
    body: 'Each tenant\u2019s WhatsApp session runs in its own isolated process. If one session crashes, your API and every other tenant keep running.',
  },
  {
    Icon: Bell,
    title: 'You hear about it first',
    body: 'A rejected key or a rate limit triggers an automatic WhatsApp alert to you \u2014 not a silent failure your customer notices before you do.',
  },
  {
    Icon: Cpu,
    title: 'One prompt, four providers',
    body: 'Write your automation logic once. The router translates it into whatever shape OpenAI, Gemini, Groq, or Manus each expect.',
  },
  {
    Icon: FileSpreadsheet,
    title: 'Orders, not just chats',
    body: 'Confirmed orders are extracted into structured records the moment a customer says yes, ready for a one-click Excel export.',
  },
];

export default function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 max-w-lg">
          <p className="text-xs font-medium uppercase tracking-wider text-intel">Built for the BYOK model</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            The parts that are easy to get wrong, handled.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="panel p-6"
            >
              <f.Icon className="h-5 w-5 text-signal" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
