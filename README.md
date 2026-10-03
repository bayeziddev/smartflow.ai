# Smartgenchatbot — BYOK Multi-Channel AI Automation Platform

**Live:** https://chatbot.sayadbayezid.com · **API:** https://fanchatbot-backend.sayadmdbayezidhosan.workers.dev/api/health

**Lost track of where things stand? Read `docs/CASE-STUDY.md` first** —
it's the full project journal: what's built, what's broken, every
Meta/Cloudflare account involved and why, and the prioritized list of
what to fix next. Everything below is quick-start setup; that file is
the "what actually happened and what's still open" reference.

A multi-tenant chatbot gateway. Tenants connect WhatsApp, Telegram, Messenger,
and Email, and bring their own OpenAI / Gemini / Groq (LLaMA 3.1) / Manus API
key. This platform is the router and the dashboard — it never pays your
tenants' AI bill for them.

```
fanchatbot-system/
├── .github/workflows/  Auto-deploy for backend-workers (Cloudflare) and frontend (GitHub
│                        Pages) — push to main, they deploy themselves. (Must stay at this
│                        exact path — GitHub only reads workflows from the repo root, not
│                        from inside a subfolder.)
├── backend/           Node.js + Express version — needs a VPS (see backend/README.md)
├── backend-workers/   Cloudflare Workers version — no VPS needed, connects to the DB directly
│                      (see backend-workers/README.md — this is the one to use if
│                      you don't have/want a VPS)
├── frontend/    React + Vite + Tailwind dashboard and landing page (logged-in app)
│                Deployed automatically to GitHub Pages on chatbot.sayadbayezid.com —
│                see deploy-frontend-pages.yml (the CNAME lives in frontend/public/)
├── whatsapp-gateway/  Always-on Node service that links a normal WhatsApp number by
│                      QR code and relays messages to the backend (see its README)
├── marketing/   Public sales page — lifetime deal + Facebook Pixel (see marketing/README.md)
└── docs/
    ├── DEPLOYMENT.md          Cloudflare setup + ongoing operations guide
    ├── CHANNELS.md            WABA vs unofficial WhatsApp, real costs, free Meta setup steps
    ├── marketing-banner.png   1200×630 launch/social-preview image (also used as the site's Open Graph image)
    ├── workflow-diagram.png   Message → reply logic flow, for docs or investors
    └── *.html                 source files for the two images above — open
                                either in a browser and re-screenshot after
                                editing text/colors, no build step needed
```

## How replies work

Every customer message — WhatsApp (official Cloud API or QR-linked number), Messenger,
or the dashboard's **Test your bot** chat — goes through the same pipeline
(`backend-workers/src/services/automationService.js`):

1. **Paused?** (Automation → toggle) → saved, no reply.
2. **Keyword rules** (Automation → Keyword auto replies) → instant fixed answer. Works with
   no AI key. English and Bangla keywords.
3. **AI** with your business name + instructions + the last 10 messages, using your own
   keys (API Keys) with automatic failover between providers. Orders it confirms are saved
   to Orders.
4. **Fallback message** if no rule matches and AI is off or every key fails — so a customer
   never gets silence.

A brand-new customer also gets the welcome message once.

## Custom domain checklist (chatbot.sayadbayezid.com)

- DNS: `CNAME chatbot → bayeziddev.github.io` (DNS only / grey cloud if on Cloudflare).
- GitHub → repo **Settings → Pages**: Source **GitHub Actions**, Custom domain
  `chatbot.sayadbayezid.com`, **Enforce HTTPS** ticked.
- The build serves from the domain root (`base: '/'` in `frontend/vite.config.js`) and ships
  `frontend/public/CNAME`. Don't set `VITE_BASE` to a full URL — that blanks the page.
- Backend CORS: `FRONTEND_URL` in `backend-workers/wrangler.jsonc` lists every origin the
  dashboard is served from (comma-separated).

## Quickstart

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npm run generate:key     # paste result into .env as ENCRYPTION_MASTER_KEY
npm run db:init          # applies src/db/schema.sql to your TiDB/MySQL instance
npm run test:crypto      # sanity check — no DB needed
npm start                # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173, proxies /api to :4000
```

Register an account at `http://localhost:5173/register`, then go to
**Dashboard → API Keys** and add a real provider key — it's encrypted
immediately and shown back to you masked from then on.

## What's been verified, not just written

- `backend-workers/test/integration.test.mjs` (`npm test`, 18 tests) — runs the real
  Worker app against a real MariaDB/MySQL: register/login/me/change-password, automatic
  schema migrations (including upgrading an old database), CORS for the custom domain,
  keyword rules (English + Bangla), AI replies with instructions/history/order capture,
  AI failure → fallback, pause, WhatsApp QR connect/status/inbound with HMAC signatures,
  the Cloud API webhook, CSV export.
- `whatsapp-gateway/test/gateway.test.mjs` (`npm test`, 14 tests) — QR → connected,
  replies to private chats only (no groups/status/own/old messages, no duplicates, order
  kept), unlink/reconnect/restore after restart, signed HTTP API.
- A browser end-to-end run (Playwright) of the built dashboard against the local Worker +
  gateway: sign up, sign in, wrong password, automation settings/rules/test chat, pause,
  QR connect → scan → connected → customer message answered → disconnect, CSV export,
  change password, forged token rejected, phone-size menu.

- `backend/scripts/test-crypto.js` — round-trips a secret through
  AES-256-GCM and confirms tampering with the ciphertext is rejected.
- `backend/scripts/integration-test.js` — run against a real MySQL/TiDB
  instance, it creates a tenant, saves/masks/resolves/invalidates an API
  key, and proves order capture is idempotent (submitting the same order
  twice inserts exactly one row). All 12 checks pass.
- `npm run build` on the frontend compiles cleanly (2000+ modules,
  no errors) — routing, Tailwind config, and every page/component wire
  up correctly.

## Design system (frontend)

Dark background (`#080B13`, not flat black) with two accent colors used
deliberately: cyan (`signal`) for the connection/channel layer, violet
(`intel`) for the AI layer. Space Grotesk for headings, Inter for body,
JetBrains Mono specifically for anything key-shaped (masked previews,
QR payloads) — using monospace only where a value is literally
code/secret data is intentional, not decorative. The landing page's
hero is a small animated diagram showing messages flowing from each
channel through "Your Router" out to each AI provider — it demonstrates
what the product does rather than illustrating it abstractly.

## Before you deploy

Full Cloudflare Tunnel + Cloudflare Pages walkthrough, plus backup/key-rotation/monitoring guidance for ongoing operation: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Short version:

1. **Encryption key**: generate one per environment, never reuse dev's
   key in production, store it in a real secrets manager, not `.env`.
2. **Manus OAuth**: register an Open App at open.manus.ai and confirm
   the authorize/token endpoint URLs in `authController.js` still match
   their current docs.
3. **Telegram/Email webhooks**: add a shared-secret check before these
   are reachable from the public internet — see the comments in
   `webhook.routes.js`.
4. **WhatsApp**: two options, both on the Channels page. The official Cloud API
   (`whatsappCloudHandler.js`) has no ban risk — see `docs/CHANNELS.md` for the
   free Meta setup. **WhatsApp (QR scan)** links any normal WhatsApp number in a
   minute but is unofficial; it needs `whatsapp-gateway/` deployed on an
   always-on host with a persistent disk — see
   [whatsapp-gateway/README.md](whatsapp-gateway/README.md).
5. **`ALLOW_PLATFORM_TRIAL_KEY`**: leave this `false` unless you're
   deliberately subsidizing trial usage on your own key — see
   `backend/README.md` for the full reasoning.
