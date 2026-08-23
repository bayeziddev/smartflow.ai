import React from 'react';

// import.meta.env.BASE_URL tracks vite.config.js's `base` — "/" locally,
// "/smartflow.ai/" on GitHub Pages — so this resolves correctly under
// either. A hardcoded "/smartgen-mark.png" would 404 once served from
// the Pages subpath.
const MARK_SRC = `${import.meta.env.BASE_URL}smartgen-mark.png`;

/**
 * Compact mark + wordmark, for the nav bar, footer, and auth screens.
 * Transparent background (the source file was a white-background JPEG;
 * see frontend/public/smartgen-mark.png) so it sits correctly on the
 * app's dark theme instead of showing as a white box.
 */
export default function Logo({ size = 32, showWordmark = true, wordmarkClassName = '' }) {
  return (
    <span className="flex items-center gap-2">
      <img src={MARK_SRC} alt="SmartGen" style={{ width: size, height: size }} className="object-contain" />
      {showWordmark && <span className={`font-display font-semibold text-ink ${wordmarkClassName}`}>SmartGen</span>}
    </span>
  );
}
