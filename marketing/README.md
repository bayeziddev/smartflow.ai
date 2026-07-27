# SmartFlow AI — Marketing / Sales Site

A separate project from the dashboard app (`frontend/`) — this is the
public sales page for advertising and selling the platform itself
(lifetime deal + monthly plan), built in the same visual style.

## Before you launch this

Two things are still placeholders — find and replace them:

1. **Prices** — `src/components/Pricing.jsx`, the `$XX` / `$XXX` / `$X`
   placeholders. Also double check the percentage-off math once you
   set a real price.
2. **Testimonials** — `src/components/TestimonialsPlaceholder.jsx` is
   deliberately fake/dashed-border placeholder content. Replace with
   real customer quotes once you have them — don't run ads with the
   placeholder text still showing.

Already done: the Facebook Pixel (ID `1612338809888151`, "Connect
With Bayezid") is wired into `index.html`.

## What already works

- `fbq('track', 'Lead')` fires on every "Get Lifetime Access" button
- `fbq('track', 'InitiateCheckout')` fires on the two pricing buttons
- `PageView` fires automatically on load
Once your real Pixel ID is in place, these three events are exactly
what Meta's ad campaign optimization looks for — no extra setup.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5174
```

## Deploy to Cloudflare Pages

Since you're managing Cloudflare yourself: this is a **separate**
Pages project from the dashboard frontend — same account, different
project, because they're two different sites (this one is the public
sales page; `frontend/` is the logged-in dashboard).

- **Root directory**: `marketing`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- Point your main business domain (`connectwithbayezid.it.com`) at
  this project, and keep the dashboard on a subdomain like
  `app.connectwithbayezid.it.com` pointed at the `frontend` project
  instead.

No `_redirects` file needed here — this is a single page with anchor
links (`#pricing`, `#features`), not client-side routing.
