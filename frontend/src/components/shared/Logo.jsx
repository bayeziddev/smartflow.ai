import React from 'react';

export default function Logo({ size = 32, showWordmark = true, wordmarkClassName = '' }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/smartgen-logo.jpeg" alt="SmartGen" style={{ width: size, height: size }} className="rounded-lg object-cover" />
      {showWordmark && <span className={`font-display font-semibold text-ink ${wordmarkClassName}`}>SmartGen</span>}
    </span>
  );
}
