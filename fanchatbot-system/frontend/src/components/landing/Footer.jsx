import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radio } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-void-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="panel flex flex-col items-center gap-5 p-10 text-center sm:p-14">
          <h2 className="max-w-md text-2xl font-semibold text-ink sm:text-3xl">
            Your AI budget, your control. Just point it at your customers.
          </h2>
          <Link to="/register" className="btn-primary">
            Connect your first channel
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 text-sm text-ink-faint sm:flex-row">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5" />
            <span>Fanchatbot</span>
          </div>
          <p>BYOK automation gateway \u2014 WhatsApp, Telegram, Messenger, Email.</p>
        </div>
      </div>
    </footer>
  );
}
