# Fanchatbot Backend

Multi-tenant, BYOK ("Bring Your Own Key") AI automation gateway. Tenants
plug in their own OpenAI / Gemini / Manus / Groq (LLaMA 3.1) keys; this
backend is the helper that stores them safely and routes requests
through them — it is never the thing paying the AI bill.

## Setup

```bash
npm install
cp .env.example .env
npm run generate:key        # paste the output into .env as ENCRYPTION_MASTER_KEY
npm run db:init             # applies src/db/schema.sql to your TiDB/MySQL instance
npm run test:crypto         # verifies the AES-256-GCM round trip (no DB needed)
npm start
```

`GET /health` should return `{"ok":true,...}` once it's running.

## Security model — read this before touching `tenant_api_configs`

- Tenant keys are AES-256-GCM encrypted (`src/utils/crypto.js`) before
  they ever reach the database. The plaintext key exists in memory only
  for the duration of the outbound HTTP call to the AI provider
  (`src/services/aiRouter/AIRouter.js`), then it's gone.
- The only thing the API ever returns about a stored key is
  `maskKey()`'s output (`sk-p...z789`). There is no endpoint, anywhere,
  that returns a decrypted key to the frontend.
- `ENCRYPTION_MASTER_KEY` is the one secret that, if lost, makes every
  stored tenant key unrecoverable, and if leaked, exposes all of them.
  Treat it like a production database password — a secrets manager in
  production, never committed, one value per environment.

## The `*_TEST_KEY` env vars — what they're actually for

`OPENAI_TEST_KEY` / `GEMINI_TEST_KEY` / `MANUS_TEST_KEY` / `GROQ_TEST_KEY`
are **your** (the platform owner's) keys, read server-side only from
`.env`. They are used for:

1. Local development — smoke-test the AI Router before any tenant has
   configured anything.
2. An **opt-in** trial fallback: set `ALLOW_PLATFORM_TRIAL_KEY=true` and
   a tenant with no key configured for a provider will transparently use
   yours instead of hitting a "please add your API key" error. This is
   **off by default** on purpose — the whole point of BYOK is that
   tenant usage bills to the tenant, not to you. Only turn it on if
   you're deliberately subsidizing a trial tier, and consider adding a
   usage cap (`ai_usage_logs.used_platform_trial_key` already flags
   which requests ran on your dime, so a cap is a `COUNT(*)` away).

## AI Router failover

`AIRouter.chat({ tenantId, provider, messages })` tries the requested
provider first, then falls over through `openai → groq → gemini → manus`
(skipping whichever one you asked for first) if it hits an error. A 401
marks that tenant's key `is_valid = 0` (stops retrying a dead key on
every message) and fires an automated WhatsApp notification via
`notificationService`. A 429 fails over immediately without
invalidating the key.

Manus is architecturally different from the other three — it's a
task/agent platform, not a synchronous chat API. See the comment block
at the top of `src/services/aiRouter/adapters/manusAdapter.js` before
relying on it in production; the task-creation call is solid, the
polling-based "wait for it to finish" wrapper is a best-effort shim and
should ideally be replaced with Manus's webhook mechanism.

## WhatsApp process isolation

Each tenant's WhatsApp session runs in its own `fork()`ed child process
(`src/channels/whatsapp/whatsappWorker.js`, managed by
`whatsappManager.js`). If `baileys` throws, or a socket wedges, that one
process dies — the main API and every other tenant's session keep
running. Auth state persists to `.wwebjs_auth/tenant-<id>/`, which is
why the deployment target needs to be persistent storage, not an
ephemeral container that wipes disk on restart.

## What's stubbed vs. fully wired

Fully implemented and tested (see `scripts/integration-test.js` and
`scripts/test-crypto.js`):
encryption, masking, tenant key CRUD, provider failover, order capture
idempotency, Excel export.

Needs your own credentials/endpoints to go live:
- Manus OAuth (`authController.js`) — register an Open App at
  open.manus.ai and confirm the authorize/token URLs match what's in
  the code comments.
- Telegram/email webhook secret verification — the routes work, but add
  a per-tenant shared secret before exposing them publicly.
- An actual inbound-email provider (Mailgun/SendGrid/Postmark inbound
  parse) pointed at `/api/webhooks/email/:tenantId`.
