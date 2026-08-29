import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import RoutingDiagram from './RoutingDiagram.jsx';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid-fade bg-grid px-6 pb-8 pt-20 sm:pt-28">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-void-border bg-void-surface px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-intel"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Bring your own AI key
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-4xl font-semibold leading-[1.1] text-ink sm:text-6xl"
        >
          Plug in your own AI.
          <br />
          <span className="text-signal">We wire it everywhere</span> your customers already are.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-5 max-w-xl text-base text-ink-muted sm:text-lg"
        >
          Connect WhatsApp, Telegram, Messenger and email to OpenAI, Gemini, Groq or Manus — using
          the keys you already pay for. Nothing routes through a key that isn't yours.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/register" className="btn-primary w-full sm:w-auto">
            Connect your first channel
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how-it-works" className="btn-ghost w-full sm:w-auto">
            See how routing works
          </a>
        </motion.div>
      </div>

      <RoutingDiagram />
    </section>
  );
}
