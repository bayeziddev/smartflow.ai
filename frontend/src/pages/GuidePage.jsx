import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import LandingNav from '../components/landing/LandingNav.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import Features from '../components/landing/Features.jsx';
import Footer from '../components/landing/Footer.jsx';
import LineChart from '../components/guide/LineChart.jsx';
import FunnelChart from '../components/guide/FunnelChart.jsx';
import ProductPreview from '../components/guide/ProductPreview.jsx';

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <LandingNav />

      <header className="bg-grid-fade bg-grid px-6 pt-20 pb-12 text-center sm:pt-28">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-void-border bg-void-surface px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-intel">
          <BarChart3 className="h-3.5 w-3.5" />
          The Guide
        </p>
        <h1 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-5xl">
          How SmartGen actually works
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted sm:text-lg">
          One place to see the whole system: how routing works, what a typical account looks like as it
          grows, and what the dashboard itself looks like once you're in.
        </p>
      </header>

      <HowItWorks />

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 max-w-lg">
            <p className="text-xs font-medium uppercase tracking-wider text-signal">What it looks like in numbers</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">
              Illustrative, not a promise — real usage varies by account.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <LineChart />
            <FunnelChart />
          </div>
        </div>
      </section>

      <Features />

      <ProductPreview />

      <section className="px-6 py-16">
        <div className="panel mx-auto flex max-w-3xl flex-col items-center gap-5 p-10 text-center sm:p-14">
          <h2 className="max-w-md text-2xl font-semibold text-ink sm:text-3xl">
            3-day free trial. No card required.
          </h2>
          <Link to="/register" className="btn-primary">
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
