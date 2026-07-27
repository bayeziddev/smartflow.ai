import React from 'react';
import LandingNav from '../components/landing/LandingNav.jsx';
import Hero from '../components/landing/Hero.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import Features from '../components/landing/Features.jsx';
import Footer from '../components/landing/Footer.jsx';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  );
}
