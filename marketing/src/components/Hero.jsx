import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import ChatDemo from './ChatDemo.jsx';
import { fbTrack } from '../fbPixel.js';

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-grid-fade bg-grid px-6 pb-16 pt-20 sm:pt-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-void-border bg-void-surface px-3.5 py-1.5 eyebrow text-gold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Lifetime access — limited time
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl"
          >
            Your own AI, answering
            <br />
            <span className="text-signal">every channel</span> — for one
            <br />
            price, forever.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-lg text-base text-ink-muted sm:text-lg"
          >
            WhatsApp, Messenger, Telegram and Email — automated with the AI
            key you already have. No per-contact pricing, no monthly bill
            that grows with your audience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href="#pricing"
              onClick={() => fbTrack('Lead', { content_name: 'hero_cta' })}
              className="btn-gold"
            >
              Get Lifetime Access
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#features" className="btn-ghost">
              See how it works
            </a>
          </motion.div>

          <p className="mt-4 text-xs text-ink-faint">
            One-time payment. Own it forever. No subscription required.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ChatDemo />
        </motion.div>
      </div>
    </section>
  );
}
