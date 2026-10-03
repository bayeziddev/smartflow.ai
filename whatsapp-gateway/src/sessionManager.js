import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';

/**
 * One WhatsApp Web session per SmartFlow tenant, linked by scanning a QR code
 * in the dashboard (WhatsApp → Linked devices → Link a device).
 *
 * Status values reported to the dashboard:
 *   qr            — waiting for the QR code to be scanned (qr holds a PNG data URL)
 *   connecting    — linking / reconnecting
 *   connected     — linked; incoming messages get automated replies
 *   disconnected  — not running (never started, QR expired unscanned, or stopped)
 *   logged_out    — the phone removed this linked device; scan again to relink
 *
 * The WhatsApp library is injected (`baileys`), so tests can drive a fake socket.
 */

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;
const SEEN_LIMIT = 2_000;

export function textOf(message) {
  const m = message?.message;
  if (!m) return '';
  const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m;
  return (
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.buttonsResponseMessage?.selectedDisplayText ||
    inner.listResponseMessage?.title ||
    ''
  ).trim();
}

/** Private 1:1 chats only — never groups, broadcasts, status updates or channels. */
export function isPrivateChat(jid) {
  return typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'));
}

/** The customer's phone number when WhatsApp tells us (newer chats may only expose a private @lid id). */
export function senderNumber(key) {
  const pn = [key?.remoteJidAlt, key?.senderPn, key?.remoteJid].find((j) => typeof j === 'string' && j.endsWith('@s.whatsapp.net'));
  const jid = pn || key?.remoteJid || '';
  return jid.split('@')[0].split(':')[0];
}

export function phoneOf(user) {
  return user?.id ? String(user.id).split('@')[0].split(':')[0] : null;
}

export class SessionManager {
  /**
   * @param {object} deps
   * @param {object} deps.baileys   { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion?, Browsers? }
   * @param {object} deps.backend   { inbound({tenantId, from, name, text, messageId}) → reply|null, status(tenantId, status, phone) }
   * @param {string} deps.dataDir   where each tenant's WhatsApp login is kept (mount a persistent disk here)
   * @param {object} [deps.logger]
   * @param {number} [deps.maxQrRefreshes] stop showing new QR codes after this many unscanned ones
   */
  constructor({ baileys, backend, dataDir, logger = console, maxQrRefreshes = 5, waLogger }) {
    this.baileys = baileys;
    this.backend = backend;
    this.dataDir = dataDir;
    this.logger = logger;
    this.waLogger = waLogger;
    this.maxQrRefreshes = maxQrRefreshes;
    this.sessions = new Map();
  }

  authDir(tenantId) {
    return join(this.dataDir, 'sessions', String(tenantId));
  }

  state(tenantId) {
    const s = this.sessions.get(String(tenantId));
    if (!s) return { status: 'disconnected', qr: null, phone: null, lastError: null };
    return { status: s.status, qr: s.status === 'qr' ? s.qrDataUrl : null, phone: s.phone, lastError: s.lastError };
  }

  list() {
    return [...this.sessions.keys()].map((tenantId) => ({ tenantId, ...this.state(tenantId), qr: undefined }));
  }

  /** Re-open every tenant that was linked before the gateway restarted. */
  async restoreAll() {
    const root = join(this.dataDir, 'sessions');
    await mkdir(root, { recursive: true });
    const restored = [];
    for (const name of await readdir(root)) {
      if (!/^\d+$/.test(name)) continue;
      try {
        await stat(join(root, name, 'creds.json'));
      } catch {
        continue;
      }
      await this.start(name, { restoring: true });
      restored.push(name);
    }
    return restored;
  }

  /**
   * Start (or resume) a tenant's session. Resolves once there is something to
   * show — a QR code, a connection, or a failure — or after `waitMs`.
   */
  async start(tenantId, { restoring = false, waitMs = 10_000 } = {}) {
    tenantId = String(tenantId);
    let s = this.sessions.get(tenantId);
    if (s && ['connected', 'qr', 'connecting'].includes(s.status) && s.sock) return this.state(tenantId);
    if (!s) {
      s = { tenantId, status: 'connecting', qrDataUrl: null, phone: null, lastError: null, sock: null, qrCount: 0, attempts: 0, seen: new Set(), queues: new Map(), stopped: false, waiters: [] };
      this.sessions.set(tenantId, s);
    }
    s.stopped = false;
    s.qrCount = 0;
    s.status = 'connecting';
    const settled = new Promise((resolve) => {
      s.waiters.push(resolve);
      setTimeout(resolve, waitMs).unref?.();
    });
    await this.connect(s, { restoring });
    await settled;
    return this.state(tenantId);
  }

  settle(s) {
    const waiters = s.waiters.splice(0);
    for (const w of waiters) w();
  }

  async connect(s, { restoring = false } = {}) {
    const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = this.baileys;
    const dir = this.authDir(s.tenantId);
    await mkdir(dir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(dir);

    let version;
    if (fetchLatestBaileysVersion) {
      try {
        version = (await fetchLatestBaileysVersion()).version;
      } catch {
        version = undefined; // fall back to the library's built-in version
      }
    }

    const sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers ? Browsers.ubuntu('SmartFlow') : ['SmartFlow', 'Chrome', '1.0'],
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      logger: this.waLogger,
    });
    s.sock = sock;
    s.hadCreds = Boolean(state?.creds?.registered) || restoring;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => this.onConnectionUpdate(s, sock, update).catch((err) => this.logger.error?.({ err: err.message }, 'connection.update failed')));
    sock.ev.on('messages.upsert', (event) => this.onMessages(s, sock, event).catch((err) => this.logger.error?.({ err: err.message }, 'messages.upsert failed')));
  }

  async onConnectionUpdate(s, sock, { connection, lastDisconnect, qr }) {
    if (sock !== s.sock) return; // an old socket we already replaced
    const { DisconnectReason } = this.baileys;

    if (qr) {
      s.qrCount += 1;
      if (s.qrCount > this.maxQrRefreshes) {
        // Nobody is scanning: stop rather than spin forever. The dashboard's "Connect" starts again.
        s.lastError = 'The QR code expired without being scanned. Press Connect to get a new one.';
        await this.stopSocket(s);
        s.status = 'disconnected';
        await this.backend.status(s.tenantId, 'disconnected');
        this.settle(s);
        return;
      }
      s.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      s.status = 'qr';
      s.lastError = null;
      if (s.qrCount === 1) await this.backend.status(s.tenantId, 'qr');
      this.settle(s);
    }

    if (connection === 'open') {
      s.status = 'connected';
      s.qrDataUrl = null;
      s.attempts = 0;
      s.hadCreds = true;
      s.lastError = null;
      s.phone = phoneOf(sock.user);
      this.logger.info?.({ tenantId: s.tenantId, phone: s.phone }, 'whatsapp linked');
      await this.backend.status(s.tenantId, 'connected', s.phone);
      this.settle(s);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode;
      s.sock = null;
      if (s.stopped) return;

      if (code === DisconnectReason.loggedOut || code === DisconnectReason.forbidden || code === DisconnectReason.multideviceMismatch) {
        // The phone unlinked us (or WhatsApp refused the account): forget the login, a new scan is needed.
        await rm(this.authDir(s.tenantId), { recursive: true, force: true });
        s.status = 'logged_out';
        s.phone = null;
        s.qrDataUrl = null;
        s.lastError = code === DisconnectReason.loggedOut ? 'This device was logged out from the phone. Scan a new QR code to link again.' : `WhatsApp refused the session (code ${code}).`;
        await this.backend.status(s.tenantId, 'logged_out');
        this.settle(s);
        return;
      }

      if (code === DisconnectReason.connectionReplaced) {
        s.status = 'disconnected';
        s.lastError = 'This WhatsApp number was opened by another gateway or WhatsApp Web session.';
        await this.backend.status(s.tenantId, 'disconnected');
        this.settle(s);
        return;
      }

      if (!s.hadCreds && s.status === 'qr' && code === DisconnectReason.timedOut) {
        s.status = 'disconnected';
        s.lastError = 'The QR code expired without being scanned. Press Connect to get a new one.';
        await this.backend.status(s.tenantId, 'disconnected');
        this.settle(s);
        return;
      }

      // Anything else (network blip, server restart, restartRequired after first scan): reconnect.
      const delay = code === DisconnectReason.restartRequired ? 0 : Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** s.attempts);
      s.attempts += 1;
      s.status = 'connecting';
      if (s.attempts === 1 && s.hadCreds) await this.backend.status(s.tenantId, 'connecting', s.phone);
      const t = setTimeout(() => {
        if (!s.stopped && !s.sock) this.connect(s).catch((err) => this.logger.error?.({ err: err.message }, 'reconnect failed'));
      }, delay);
      t.unref?.();
    }
  }

  async onMessages(s, sock, { messages, type }) {
    if (type !== 'notify') return; // history sync / appends are not new customer messages
    for (const msg of messages || []) {
      const key = msg.key || {};
      if (key.fromMe || !isPrivateChat(key.remoteJid)) continue;
      const text = textOf(msg);
      if (!text) continue;
      if (key.id) {
        if (s.seen.has(key.id)) continue;
        s.seen.add(key.id);
        if (s.seen.size > SEEN_LIMIT) s.seen.delete(s.seen.values().next().value);
      }
      // One chat at a time, in order, so replies never arrive out of sequence.
      const chat = key.remoteJid;
      const prev = s.queues.get(chat) || Promise.resolve();
      const next = prev.then(() => this.reply(s, sock, msg, text)).catch((err) => this.logger.error?.({ tenantId: s.tenantId, err: err.message }, 'reply failed'));
      s.queues.set(chat, next);
      next.finally(() => {
        if (s.queues.get(chat) === next) s.queues.delete(chat);
      });
    }
  }

  async reply(s, sock, msg, text) {
    const key = msg.key;
    const from = senderNumber(key);
    try {
      await sock.readMessages?.([key]);
    } catch {
      /* read receipts are best effort */
    }
    try {
      await sock.sendPresenceUpdate?.('composing', key.remoteJid);
    } catch {
      /* typing indicator is best effort */
    }
    let reply;
    try {
      reply = await this.backend.inbound({ tenantId: s.tenantId, from, name: msg.pushName || null, text, messageId: key.id });
    } finally {
      try {
        await sock.sendPresenceUpdate?.('paused', key.remoteJid);
      } catch {
        /* ignore */
      }
    }
    if (reply) await sock.sendMessage(key.remoteJid, { text: reply });
  }

  async send(tenantId, to, text) {
    const s = this.sessions.get(String(tenantId));
    if (!s?.sock || s.status !== 'connected') {
      const err = new Error('WhatsApp is not connected for this account');
      err.status = 409;
      throw err;
    }
    const jid = String(to).includes('@') ? String(to) : `${String(to).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await s.sock.sendMessage(jid, { text: String(text) });
    return { ok: true, to: jid };
  }

  async stopSocket(s) {
    s.stopped = true;
    const sock = s.sock;
    s.sock = null;
    try {
      sock?.end?.(undefined);
    } catch {
      /* ignore */
    }
  }

  /** Unlink from the phone and forget the login. */
  async logout(tenantId) {
    tenantId = String(tenantId);
    const s = this.sessions.get(tenantId);
    if (s?.sock) {
      try {
        s.stopped = true;
        await s.sock.logout();
      } catch {
        /* already gone */
      }
      await this.stopSocket(s);
    }
    await rm(this.authDir(tenantId), { recursive: true, force: true });
    this.sessions.delete(tenantId);
    await this.backend.status(tenantId, 'logged_out');
    return this.state(tenantId);
  }

  async shutdown() {
    for (const s of this.sessions.values()) await this.stopSocket(s);
  }
}
