// Safe wrapper — does nothing if the Pixel hasn't loaded (ad blockers,
// or YOUR_PIXEL_ID in index.html hasn't been replaced yet) instead of
// throwing and breaking the button click.
export function fbTrack(eventName, params) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', eventName, params);
  }
}
