import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Do I need to pay for AI usage separately?',
    a: 'Yes \u2014 you connect your own OpenAI, Gemini, Groq or Manus key, and pay that provider directly for usage. This purchase is for the platform that routes and automates everything, not the AI tokens themselves.',
  },
  {
    q: 'Is my API key safe?',
    a: 'It\u2019s AES-256-GCM encrypted the moment you save it. From then on, only a masked preview is ever shown \u2014 not even to you, and never in any log.',
  },
  {
    q: 'What happens if I run out of AI credit with my provider?',
    a: 'The platform can automatically fail over to a backup provider you\u2019ve configured, and it notifies you immediately so you can top up \u2014 your customers keep getting replies in the meantime.',
  },
  {
    q: 'Which channels are included?',
    a: 'WhatsApp (official Cloud API), Messenger, Telegram, and Email \u2014 all included, no add-on fees per channel.',
  },
  {
    q: 'Is this a one-time payment for real?',
    a: 'Yes for the Lifetime plan \u2014 pay once, use it as long as you want. A Monthly plan is also available if you\u2019d rather not pay upfront.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-void-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-5 text-left">
        <span className="font-medium text-ink">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-sm text-ink-muted">{a}</p>}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="eyebrow text-signal">Questions</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">Frequently asked</h2>
        </div>
        <div>
          {FAQS.map((f) => (
            <FAQItem key={f.q} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
