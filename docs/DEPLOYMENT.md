# Deployment & Operations Guide

How to run Fanchatbot in production, put it behind Cloudflare, and keep
it healthy afterward. Read `backend/README.md` first if you haven't —
this guide assumes you already have it running locally.

## 1. Architecture in production

```
Customer's phone/app
      │
      ▼
 WhatsApp / Telegram / Messenger / Email
      │
      ▼
┌─────────────────────────┐        ┌──────────────────────────┐
│  Cloudflare Tunnel        │──────▶│  Backend (Node.js)        │
│  (no open ports on your   │       │  on a persistent VPS       │
│  server)                  │       │  — needs local disk for    │
└─────────────────────────┘        │  .wwebjs_auth and the DB   │
                                     └──────────────────────────┘
Browser ──▶ Cloudflare Pages (static React build) ──▶ calls the
            backend's public hostname over HTTPS
```

Two different Cloudflare products doing two different jobs:
- **Cloudflare Pages** hosts the frontend's static build (`frontend/dist`)
  — free, fast, nothing to patch.
- **Cloudflare Tunnel** (`cloudflared`) exposes the backend running on
  your VPS without opening any inbound firewall port. This part
  **must** be a real, persistently-running server (a $5–10/mo VPS is
  fine) — not a serverless function — because WhatsApp's session file
  (`.wwebjs_auth/`) and your MySQL/TiDB data both need to survive
  restarts on local disk.

## 2. Backend: VPS + Cloudflare Tunnel

On your VPS (Ubuntu/Debian assumed):

```bash
git clone <your-repo> && cd fanchatbot-system/backend
npm install --omit=dev
cp .env.example .env        # fill in real values, including a fresh
                             # ENCRYPTION_MASTER_KEY from `npm run generate:key`
npm run db:init
```

Keep the process alive with `pm2` (or systemd — either works):

```bash
npm install -g pm2
pm2 start server.js --name fanchatbot-backend
pm2 save
pm2 startup   # follow the printed command to survive reboots
```

Install and authenticate `cloudflared`:

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared

cloudflared tunnel login                      # opens a browser to pick your domain
cloudflared tunnel create fanchatbot-backend  # prints a tunnel UUID — note it
```

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID-FROM-ABOVE>
credentials-file: /root/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:4000
  - service: http_status:404
```

Point DNS at the tunnel and run it as a service so it survives reboots:

```bash
cloudflared tunnel route dns fanchatbot-backend api.yourdomain.com
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

`api.yourdomain.com` now reaches your backend with Cloudflare's SSL,
DDoS protection, and no open port on the VPS itself. In the Cloudflare
dashboard, set **SSL/TLS → Overview** to **Full (strict)**.

## 3. Frontend: Cloudflare Pages

1. Push `fanchatbot-system` to a GitHub/GitLab repo.
2. Cloudflare dashboard → **Workers & Pages → Create application → Pages
   → Import an existing Git repository**.
3. Build settings:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Environment variable: `VITE_API_BASE_URL = https://api.yourdomain.com/api`
   (Vite only exposes env vars prefixed `VITE_` — this is why the
   variable is named that way in `frontend/.env.example`.)
5. `frontend/public/_redirects` (already included) tells Pages to serve
   `index.html` for every route, so refreshing `/dashboard/secrets`
   directly doesn't 404 — required for any React Router SPA.
6. Save & deploy. Add a custom domain (e.g. `app.yourdomain.com`) under
   the project's **Custom domains** tab once it's live.

Every push to your main branch redeploys automatically; every other
branch/PR gets its own preview URL for free.

## 4. Ongoing management

**Backups** — two things actually matter:
- The database (`mysqldump` on a schedule, or your TiDB provider's
  built-in backup if you're using TiDB Cloud).
- `.wwebjs_auth/` on the VPS — losing this means every tenant has to
  re-scan a WhatsApp QR code. Back it up alongside the database.

**Key rotation** — `ENCRYPTION_MASTER_KEY` is the one secret that
protects every tenant's stored API key. To rotate it: decrypt all
`tenant_api_configs.encrypted_api_key` rows with the old key, re-encrypt
with the new one, in a single maintenance-window script — never just
swap the env var, or every existing row becomes undecryptable.

**Monitoring** — `ai_usage_logs` already records `http_status` and
`latency_ms` per request; a query like
`SELECT provider_used, http_status, COUNT(*) FROM ai_usage_logs WHERE created_at > NOW() - INTERVAL 1 DAY GROUP BY 1,2`
gives you a same-day view of which provider is failing for which tenant
before they email you about it.

**Updating dependencies** — `npm outdated` in both `backend/` and
`frontend/` periodically; `@whiskeysockets/baileys` in particular moves
fast since it tracks WhatsApp's own protocol changes, so pin it and
update deliberately rather than on `npm install` auto-latest.

**If the encryption key ever leaks** — treat it like a breach: rotate
the key immediately (see above), and separately ask every tenant to
regenerate their provider API keys, since a leaked master key means
every stored key must be considered compromised, not just re-encrypted.
