import React from 'react';
import { fbTrack } from '../fbPixel.js';
import Logo from './Logo.jsx';

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border/60 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top">
          <Logo wordmarkClassName="text-lg" />
        </a>
        <nav className="hidden items-center gap-8 text-sm text-ink-muted sm:flex">
          <a href="#features" className="transition-colors hover:text-ink">Features</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
        </nav>
        <a
          href="#pricing"
          onClick={() => fbTrack('Lead', { content_name: 'nav_cta' })}
          className="btn-primary !px-4 !py-2 text-sm"
        >
          Get Lifetime Access
        </a>
      </div>
    </header>
  );
}
