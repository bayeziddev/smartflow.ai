# Fanchatbot Backend — Cloudflare Workers Edition

A rewrite of `backend/` for a no-VPS setup: runs entirely on Cloudflare
Workers, connects to a MySQL-compatible database via Hyperdrive
(Cloudflare's free connection layer for exactly this). No server to
rent, patch, or keep alive.

**Verified working**, not just written: booted in the real Cloudflare
Workers runtime (`wrangler dev`) against a live MySQL database and
walked through register → save an encrypted key → save channel
credentials → simulate Meta's webhook handshake → list orders, all
passing, before this was packaged up.

## What's different from `backend/` (the Node/Express version)

| | `backend/` | `backend-workers/` |
|---|---|---|
| Runs on | A VPS you rent and manage | Cloudflare's edge, free tier |
| Web framework | Express | Hono (same shape, Workers-native) |
| Encryption | Node's `crypto` module | Web Crypto (`crypto.subtle`) — same AES-256-GCM guarantee |
| Database access | `mysql2` pool, direct connection | `mysql2` + Hyperdrive (same driver, different connection pattern) |
| Order export | `.xlsx` via exceljs | `.csv` — exceljs leans on Node internals that aren't safe to assume work in Workers; CSV opens in Excel natively with zero risk |
| WhatsApp/Messenger | Same official Cloud API | Identical — these were already just webhook + fetch calls |
| Telegram, Email, Manus OAuth | Built | **Not yet ported** — see "What's deferred" below |

## One-time setup

### 1. Get a MySQL-compatible database (you don't have a VPS, so this replaces one)

Recommended: **[TiDB Cloud Serverless](https://tidbcloud.com)** — free
tier, no card required, and it's the same MySQL dialect this schema
was already written for.

1. Sign up, create a Serverless cluster
2. Get the connection details (host, port, user, password, database name)
3. Apply the schema: connect with any MySQL client (TiDB Cloud's own
   web SQL console works fine) and run `src/db/schema.sql`

### 2. Create the Hyperdrive binding

```bash
npx wrangler hyperdrive create fanchatbot-db \
  --connection-string="mysql://USER:PASSWORD@HOST:PORT/DBNAME"
```

Copy the `id` it prints into `wrangler.jsonc`, replacing
`REPLACE_WITH_YOUR_HYPERDRIVE_ID`.

### 3. Set secrets

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ENCRYPTION_MASTER_KEY   # generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put ALLOW_PLATFORM_TRIAL_KEY   # "true" or "false" — see backend/README.md, same reasoning applies here
# Optional, only if you're using the platform-trial fallback:
npx wrangler secret put OPENAI_TEST_KEY
npx wrangler secret put GEMINI_TEST_KEY
npx wrangler secret put MANUS_TEST_KEY
npx wrangler secret put GROQ_TEST_KEY
```

### 4. Run it

```bash
npm install
npm run dev       # local dev — see below for testing against a real DB locally
npm run deploy    # ships it to Cloudflare, live
```

## Testing locally against a real database

`wrangler dev` needs to know what to connect Hyperdrive to for local
runs. Copy `.dev.vars.example` to `.dev.vars` and fill in real values,
then point Hyperdrive's local emulation at your database:

```bash
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="mysql://user:pass@host:port/dbname"
npm run dev
```

## What's deferred (not built in this pass)

- **Telegram** — telegraf (the Node library) isn't guaranteed
  Workers-safe; porting this channel means calling Telegram's Bot API
  directly with `fetch()` instead, which is straightforward but not
  done yet.
- **Email** — nodemailer needs raw SMTP sockets, which don't fit
  Workers' networking model. A Workers-native email channel would use
  a transactional email HTTP API instead (Cloudflare has a built-in
  MailChannels integration, or use Resend/SendGrid's API).
- **Manus OAuth ("Sign in with Manus")** — email/password auth is
  fully working; the OAuth flow from `backend/`'s `authController.js`
  hasn't been ported over yet.
- **Tenant self-alerts on key failure** — `notificationService.js` has
  a flagged gap: it needs a place to store the tenant's own admin
  WhatsApp number to notify, separate from their business sending
  number. See the comment in that file.

None of these block WhatsApp or Messenger working — they're the next
things to pick up, not prerequisites.
