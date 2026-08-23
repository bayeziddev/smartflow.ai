import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../shared/Logo.jsx';

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border/60 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <Logo wordmarkClassName="text-lg" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-muted sm:flex">
          <a href="#how-it-works" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-ink">
            Features
          </a>
          <Link to="/guide" className="transition-colors hover:text-ink">
            Guide
          </Link>
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
