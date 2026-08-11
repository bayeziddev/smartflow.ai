# Fanchatbot Backend — Cloudflare Workers Edition

A rewrite of `backend/` for a no-VPS setup: runs entirely on Cloudflare
Workers, connecting straight to a MySQL-compatible database with
`mysql2`. No server to rent, patch, or keep alive.

**Not using Hyperdrive:** Cloudflare Hyperdrive's MySQL proxy doesn't
support the `AuthSwitchRequest` handshake TiDB Cloud (and MySQL 8+ with
`caching_sha2_password`) uses — it fails with error code 2015,
`Hyperdrive does not currently support MySQL AuthSwitchRequest
messages`. `src/db/client.js` connects directly instead, since `mysql2`
implements the full handshake itself.

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
| Database access | `mysql2` pool, direct connection | `mysql2`, single connection per request (no long-lived pool — see `src/db/client.js`) |
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

### 2. Point `wrangler.jsonc` at your database

`DB_HOST`, `DB_PORT`, and `DB_DATABASE` live as plain `vars` in
`wrangler.jsonc` (they aren't sensitive) — edit them there to match
your cluster. `DB_USER` and `DB_PASSWORD` are secrets, set below.

### 3. Set secrets

```bash
npx wrangler secret put DB_USER
npx wrangler secret put DB_PASSWORD
npx wrangler secret put JWT_SECRET   # generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put ENCRYPTION_MASTER_KEY   # generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put ALLOW_PLATFORM_TRIAL_KEY   # "true" or "false" — see backend/README.md, same reasoning applies here
# Optional, only if you're using the platform-trial fallback:
npx wrangler secret put OPENAI_TEST_KEY
npx wrangler secret put GEMINI_TEST_KEY
npx wrangler secret put MANUS_TEST_KEY
npx wrangler secret put GROQ_TEST_KEY
npx wrangler secret put XAI_KEY   # xAI's Grok — see the note below before you confuse this with Groq
```

**Groq vs. Grok — five supported providers, not four:**
`openai`, `gemini`, `groq`, `manus`, and now `xai` are all valid values
for `provider` in the API and database. **"Groq"** (`groq`) is the fast-
inference company serving Llama models. **"Grok"** (`xai`) is xAI's own
model, a completely different company and product that happens to
sound identical out loud. Both are wired in and independent of each
other — this isn't a typo, it's two real, separate integrations.

### 4. (Optional) Auto-deploy from GitHub instead of running `wrangler deploy` yourself

If clicking through the Cloudflare dashboard is the painful part, this
removes it entirely: `.github/workflows/deploy-backend-workers.yml`
(at the repo root, not inside this folder — GitHub only reads workflow
files from the repository's root `.github/workflows/`) redeploys this
backend automatically on every push to `main` that touches
`backend-workers/`. To turn it on, add two **GitHub repository**
secrets (Settings → Secrets and variables → Actions — a different
place from the `wrangler secret put` ones above, which live in
Cloudflare, not GitHub):

- `CLOUDFLARE_API_TOKEN` — create one at
  dash.cloudflare.com → My Profile → API Tokens → "Edit Cloudflare Workers" template
- `CLOUDFLARE_ACCOUNT_ID` — found on the right sidebar of any page in
  your Cloudflare dashboard

Once both are set, `git push` redeploys, but secrets (`DB_USER`,
`DB_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_MASTER_KEY`) still need to
exist first. `.github/workflows/setup-database-secrets.yml` does that
one-time step for you: add a third GitHub secret, `DB_CONNECTION_STRING`
(`mysql://USER:PASSWORD@HOST:PORT/DBNAME`), then run that workflow
manually from the Actions tab. It parses the user/password out of the
connection string, sets all four Worker secrets, and deploys. Safe to
re-run any time you rotate the database password.

### 4. Run it

```bash
npm install
npm run dev       # local dev — see below for testing against a real DB locally
npm run deploy    # ships it to Cloudflare, live
```

## Testing locally against a real database

`wrangler dev` reads secrets from a local `.dev.vars` file (gitignored
— never commit it) instead of Cloudflare's secret store:

```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=any-string-for-local-testing
ENCRYPTION_MASTER_KEY=any-64-hex-chars-for-local-testing
```

`DB_HOST` / `DB_PORT` / `DB_DATABASE` come from `wrangler.jsonc`'s
`vars` as usual. Then:

```bash
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
