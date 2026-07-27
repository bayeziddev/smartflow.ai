import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CheckCheck } from 'lucide-react';

const SCRIPT = [
  { from: 'customer', text: 'Hi! Is the wireless mic still in stock?' },
  { from: 'typing' },
  { from: 'ai', text: 'Yes — 2 left in black. Want me to lock one in for you?' },
  { from: 'customer', text: 'Yes please, 1 unit' },
  { from: 'typing' },
  { from: 'ai', text: '✅ Order confirmed — 1x Wireless Mic. You\u2019ll see it in your dashboard now.' },
];

export default function ChatDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delay = SCRIPT[step]?.from === 'typing' ? 900 : 1600;
    const timer = setTimeout(() => {
      setStep((s) => (s + 1) % (SCRIPT.length + 2)); // +2 = brief pause at the end before looping
    }, delay);
    return () => clearTimeout(timer);
  }, [step]);

  const visible = SCRIPT.slice(0, Math.min(step + 1, SCRIPT.length));

  return (
    <div className="panel mx-auto w-full max-w-md overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-void-border bg-void-elevated/60 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-void text-signal">
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-ink">Your Store</p>
          <p className="flex items-center gap-1 text-[11px] text-wire-on">
            <span className="h-1.5 w-1.5 rounded-full bg-wire-on" /> Active now &middot; AI replying
          </p>
        </div>
      </div>

      <div className="flex min-h-[280px] flex-col justify-end gap-2.5 p-4">
        <AnimatePresence initial={false}>
          {visible.map((msg, i) => {
            if (msg.from === 'typing') {
              return (
                <motion.div
                  key={`typing-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 self-start rounded-2xl rounded-bl-sm bg-void-elevated px-4 py-3"
                >
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-ink-faint" />
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-ink-faint" style={{ animationDelay: '0.15s' }} />
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-ink-faint" style={{ animationDelay: '0.3s' }} />
                </motion.div>
              );
            }
            const isAi = msg.from === 'ai';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                  isAi
                    ? 'self-start rounded-bl-sm bg-void-elevated text-ink'
                    : 'self-end rounded-br-sm bg-signal text-void'
                }`}
              >
                {msg.text}
                {!isAi && (
                  <span className="mt-1 flex justify-end">
                    <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
