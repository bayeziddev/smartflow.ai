import React from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import Pricing from './components/Pricing.jsx';
import Comparison from './components/Comparison.jsx';
import TestimonialsPlaceholder from './components/TestimonialsPlaceholder.jsx';
import FAQ from './components/FAQ.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Features />
      <Pricing />
      <Comparison />
      <TestimonialsPlaceholder />
      <FAQ />
      <Footer />
    </div>
  );
}
