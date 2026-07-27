import React from 'react';
import { Quote } from 'lucide-react';

const SLOTS = [1, 2, 3];

export default function TestimonialsPlaceholder() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="eyebrow text-intel">Ready when you are</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">What customers say</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            This section is a placeholder \u2014 swap these three cards for real quotes and photos
            once you have your first customers. Don't launch ads with these as-is.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {SLOTS.map((n) => (
            <div key={n} className="panel border-dashed p-6 opacity-70">
              <Quote className="h-5 w-5 text-ink-faint" />
              <p className="mt-3 text-sm italic text-ink-faint">
                "Replace this with a real quote from an actual customer once you have one."
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-void-elevated" />
                <div>
                  <p className="text-sm font-medium text-ink-faint">Customer name</p>
                  <p className="text-xs text-ink-faint">Business / location</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
