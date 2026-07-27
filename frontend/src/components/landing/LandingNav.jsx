import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border/60 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-void-elevated text-signal">
            <Radio className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-semibold text-ink">Fanchatbot</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-muted sm:flex">
          <a href="#how-it-works" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-ink">
            Features
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-ink-muted transition-colors hover:text-ink">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
