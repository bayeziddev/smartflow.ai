import React from 'react';

const BASE = import.meta.env.BASE_URL;

const SCREENS = [
  {
    src: `${BASE}guide-screenshots/overview.png`,
    alt: 'SmartGen dashboard overview screen',
    label: 'Dashboard overview',
  },
  {
    src: `${BASE}guide-screenshots/channels.png`,
    alt: 'SmartGen channels connection screen showing WhatsApp, Telegram and Messenger',
    label: 'Connect a channel',
  },
];

export default function ProductPreview() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-lg">
          <p className="text-xs font-medium uppercase tracking-wider text-intel">Product preview</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">The real dashboard, not a mockup.</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {SCREENS.map((s) => (
            <figure key={s.src} className="panel overflow-hidden">
              <img src={s.src} alt={s.alt} className="w-full border-b border-void-border" loading="lazy" />
              <figcaption className="p-4 text-sm text-ink-muted">{s.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
