# WhatsApp QR gateway

Lets a SmartFlow customer link their **normal WhatsApp or WhatsApp Business app number by scanning a QR code** — the same way WhatsApp Web works — and get automatic replies on it. No Meta developer account needed.

```
Customer ──WhatsApp──▶ gateway (this service, holds the WhatsApp Web session)
                          │  signed POST /api/internal/whatsapp-qr/inbound
                          ▼
                       backend (Cloudflare Worker) → keyword rules → AI → fallback
                          │  { reply }
                          ▼
Customer ◀──WhatsApp── gateway sends the reply
```

Cloudflare Workers can't keep a WhatsApp Web connection open, so this small Node service does it. It must run **24/7 on a host with a persistent disk**.

> **Ban risk.** QR linking uses the unofficial WhatsApp Web protocol ([Baileys](https://github.com/WhiskeySockets/Baileys)). WhatsApp may restrict numbers that spam or bulk-message. The gateway only *replies* to people who message first and never starts chats or messages groups, which keeps the risk low, but it is not zero. For zero risk use the official WhatsApp Cloud API channel instead (it's on the same Channels page).

## 1. Deploy it

Pick one. You need: the Dockerfile in this folder, a persistent volume at `/data`, and the env vars below.

### Railway (easiest)
1. New Project → Deploy from GitHub repo → pick this repo.
2. Service → Settings → **Root Directory**: `whatsapp-gateway` (Railway finds the Dockerfile).
3. Service → **Volumes** → Add volume, mount path `/data`.
4. Variables: `GATEWAY_SECRET`, `BACKEND_URL` (see below).
5. Settings → Networking → **Generate Domain**. Copy the `https://….up.railway.app` URL.

### Any VPS with Docker
```bash
cd whatsapp-gateway
docker build -t smartflow-wa-gateway .
docker run -d --name wa-gateway --restart unless-stopped \
  -p 8790:8790 -v wa-gateway-data:/data \
  -e GATEWAY_SECRET=your-long-random-secret \
  -e BACKEND_URL=https://fanchatbot-backend.sayadmdbayezidhosan.workers.dev \
  smartflow-wa-gateway
```
Put it behind HTTPS (Caddy / Nginx / Cloudflare Tunnel), e.g. `https://wa.sayadbayezid.com`.

Render and Fly.io also work — any plan that gives you a persistent disk and doesn't sleep.

### Environment

| Variable | Required | Meaning |
|---|---|---|
| `GATEWAY_SECRET` | yes | Shared secret, ≥16 chars. **Same value** as the backend's `WA_GATEWAY_SECRET`. `openssl rand -hex 32` |
| `BACKEND_URL` | yes | The backend, e.g. `https://fanchatbot-backend.sayadmdbayezidhosan.workers.dev` |
| `DATA_DIR` | no | Where logins are kept (`/data` in Docker). Must persist across restarts |
| `PORT` | no | Default `8790` |
| `LOG_LEVEL` | no | `info` (default), `debug`, `warn` |

## 2. Point the backend at it

In `backend-workers/`:
```bash
npx wrangler secret put WA_GATEWAY_SECRET     # paste the same secret
```
and set `WA_GATEWAY_URL` in `backend-workers/wrangler.jsonc` → `vars` to the gateway's public URL (e.g. `https://wa-gateway.up.railway.app`), then redeploy (push to `main` does it). Or set both in Cloudflare dashboard → Workers → fanchatbot-backend → Settings → Variables and Secrets.

Check: `curl https://<gateway>/health` → `{"ok":true,…}`.

## 3. Link a number

Dashboard → **Channels → WhatsApp (QR scan) → Connect with QR**, then on the phone: WhatsApp → ⋮ / Settings → **Linked devices → Link a device** → scan. The card turns green with the number. Send that number a message from another phone — you get the reply you configured on the **Automation** page.

- Keep the phone online now and then; WhatsApp unlinks devices after ~14 days if the phone never connects.
- **Disconnect** on the card (or removing the device on the phone) unlinks it and deletes the saved login.
- After a gateway restart, linked numbers reconnect by themselves (that's what the `/data` volume is for).

## API (used only by the backend)

All routes except `/health` need `x-sf-timestamp` + `x-sf-signature = hex(HMAC-SHA256(secret, "<timestamp>.<raw body>"))`, at most 5 minutes old.

| Route | |
|---|---|
| `GET /health` | liveness |
| `GET /sessions/:tenantId` | `{status, qr, phone, lastError}` — status is `qr`, `connecting`, `connected`, `disconnected` or `logged_out`; `qr` is a PNG data URL |
| `POST /sessions/:tenantId/start` | start linking (or reconnect); waits up to 10 s for the first QR |
| `POST /sessions/:tenantId/logout` | unlink and delete the login |
| `POST /sessions/:tenantId/send` | `{to, text}` send a message from the linked number |

## Develop

```bash
npm install
npm test          # 14 tests, uses a fake WhatsApp socket — no phone needed
GATEWAY_SECRET=local-gateway-secret BACKEND_URL=http://127.0.0.1:8787 npm start
```
