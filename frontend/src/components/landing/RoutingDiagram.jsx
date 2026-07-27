import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Mail, Users, Sparkles, Zap, Cpu, Bot } from 'lucide-react';

const CHANNELS = [
  { label: 'WhatsApp', Icon: MessageCircle },
  { label: 'Telegram', Icon: Send },
  { label: 'Messenger', Icon: Users },
  { label: 'Email', Icon: Mail },
];

const PROVIDERS = [
  { label: 'OpenAI', Icon: Sparkles },
  { label: 'Gemini', Icon: Zap },
  { label: 'Groq · LLaMA 3.1', Icon: Cpu },
  { label: 'Manus', Icon: Bot },
];

function NodePill({ label, Icon, align, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: align === 'left' ? -16 : 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={`flex items-center gap-2.5 rounded-full border border-void-border bg-void-surface/80 py-2 pl-3 pr-4
                  text-sm text-ink-muted backdrop-blur ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-void-elevated">
        <Icon className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
      </span>
      {label}
    </motion.div>
  );
}

export default function RoutingDiagram() {
  return (
    <div className="relative mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4 py-6 sm:gap-8">
      {/* connecting wires — pure SVG, scales with the grid via viewBox */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 320"
        preserveAspectRatio="none"
        fill="none"
      >
        {[48, 128, 208, 288].map((y, i) => (
          <path
            key={`l-${i}`}
            d={`M 190 ${y} C 320 ${y}, 320 160, 400 160`}
            stroke="url(#wireGradLeft)"
            strokeWidth="1.5"
            strokeDasharray="6 5"
            className="animate-dash"
            style={{ strokeDashoffset: 0, animationDelay: `${i * 0.15}s` }}
          />
        ))}
        {[48, 128, 208, 288].map((y, i) => (
          <path
            key={`r-${i}`}
            d={`M 400 160 C 480 160, 480 ${y}, 610 ${y}`}
            stroke="url(#wireGradRight)"
            strokeWidth="1.5"
            strokeDasharray="6 5"
            className="animate-dash"
            style={{ strokeDashoffset: 0, animationDelay: `${0.4 + i * 0.15}s` }}
          />
        ))}
        <defs>
          <linearGradient id="wireGradLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#00E5FF" stopOpacity="0.05" />
            <stop offset="1" stopColor="#00E5FF" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="wireGradRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7C5CFF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7C5CFF" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 flex flex-col gap-3">
        {CHANNELS.map((c, i) => (
          <NodePill key={c.label} align="left" delay={i * 0.06} {...c} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-signal/40
                   bg-void-surface shadow-glow-signal sm:h-28 sm:w-28"
      >
        <span className="h-2 w-2 animate-pulseDot rounded-full bg-wire-on" />
        <span className="mt-2 text-center font-display text-[11px] font-semibold uppercase tracking-wider text-ink">
          Your
          <br />
          Router
        </span>
      </motion.div>

      <div className="relative z-10 flex flex-col gap-3">
        {PROVIDERS.map((p, i) => (
          <NodePill key={p.label} align="right" delay={0.15 + i * 0.06} {...p} />
        ))}
      </div>
    </div>
  );
}
