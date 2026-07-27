import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-grid-fade bg-grid px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-void-elevated text-signal">
            <Radio className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-semibold text-ink">Fanchatbot</span>
        </Link>

        <div className="panel p-8">
          <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
