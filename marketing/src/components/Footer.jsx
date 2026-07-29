import React from 'react';
import { ArrowRight } from 'lucide-react';
import { fbTrack } from '../fbPixel.js';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-void-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="panel flex flex-col items-center gap-5 p-10 text-center sm:p-14">
          <h2 className="max-w-md text-2xl font-semibold text-ink sm:text-3xl">
            Stop paying more as your customers do more talking.
          </h2>
          <a
            href="#pricing"
            onClick={() => fbTrack('Lead', { content_name: 'footer_cta' })}
            className="btn-gold"
          >
            Get Lifetime Access
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 text-sm text-ink-faint sm:flex-row">
          <Logo size={20} wordmarkClassName="!text-ink-faint text-sm" />
          <p>Bring-your-own-AI automation for WhatsApp, Messenger, Telegram &amp; Email.</p>
        </div>
      </div>
    </footer>
  );
}
