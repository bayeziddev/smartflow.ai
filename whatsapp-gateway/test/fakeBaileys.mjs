import { EventEmitter } from 'node:events';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * A stand-in for the `baileys` module: same function names, but the socket is
 * driven by the test (emit a QR, open the connection, deliver a message…).
 */
export function createFakeBaileys() {
  const sockets = [];
  const DisconnectReason = { connectionClosed: 428, connectionLost: 408, connectionReplaced: 440, timedOut: 408, loggedOut: 401, badSession: 500, restartRequired: 515, multideviceMismatch: 411, forbidden: 403 };

  function makeWASocket({ auth }) {
    const ev = new EventEmitter();
    const sock = {
      ev,
      auth,
      user: null,
      sent: [],
      presence: [],
      read: [],
      ended: false,
      loggedOut: false,
      async sendMessage(jid, content) {
        sock.sent.push({ jid, ...content });
        return { key: { id: `out-${sock.sent.length}` } };
      },
      async sendPresenceUpdate(type, jid) {
        sock.presence.push({ type, jid });
      },
      async readMessages(keys) {
        sock.read.push(...keys);
      },
      async logout() {
        sock.loggedOut = true;
      },
      end() {
        sock.ended = true;
      },
      // test drivers
      showQr(code = `qr-${sockets.length}-${Math.random()}`) {
        ev.emit('connection.update', { qr: code });
      },
      open(phone = '8801700000000') {
        sock.user = { id: `${phone}:7@s.whatsapp.net`, name: 'Shop' };
        auth.creds.registered = true;
        ev.emit('creds.update', {});
        ev.emit('connection.update', { connection: 'open' });
      },
      close(statusCode) {
        ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode } } } });
      },
      deliver(messages, type = 'notify') {
        ev.emit('messages.upsert', { messages, type });
      },
    };
    sockets.push(sock);
    return sock;
  }

  async function useMultiFileAuthState(dir) {
    await mkdir(dir, { recursive: true });
    let creds = { registered: false };
    try {
      creds = JSON.parse(await readFile(join(dir, 'creds.json'), 'utf8'));
    } catch {
      /* fresh */
    }
    const state = { creds, keys: {} };
    return { state, saveCreds: async () => writeFile(join(dir, 'creds.json'), JSON.stringify(state.creds)) };
  }

  /** Resolves with sockets[index] once the code under test has opened it (no fixed sleeps). */
  async function waitForSocket(index, timeoutMs = 3000) {
    const deadline = Date.now() + timeoutMs;
    while (!sockets[index]) {
      if (Date.now() > deadline) throw new Error(`socket #${index} was never opened`);
      await tick(5);
    }
    return sockets[index];
  }

  return { makeWASocket, useMultiFileAuthState, DisconnectReason, sockets, waitForSocket };
}

export const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
