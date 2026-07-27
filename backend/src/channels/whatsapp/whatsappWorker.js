/**
 * This file is never `require()`d — it is `fork()`ed as its own OS
 * process by whatsappManager.js, one process per tenant. That
 * isolation is the whole point: if baileys throws, or the socket
 * enters a bad state, only THIS process dies. The main Express API
 * and every other tenant's WhatsApp session are unaffected.
 *
 * Talks to the parent process over Node's built-in IPC channel
 * (process.send / process.on('message')) rather than a shared DB
 * connection, so it stays a thin transport layer — all business logic
 * (AI replies, order capture) lives in automationService and is
 * invoked by the parent, not here.
 */
require('dotenv').config();
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const tenantId = process.env.WHATSAPP_TENANT_ID;
if (!tenantId) {
  console.error('whatsappWorker started without WHATSAPP_TENANT_ID');
  process.exit(1);
}

// Persistent auth state per tenant — this is the `.wwebjs_auth`-style
// directory the deployment notes call out as needing durable storage
// across restarts (reserved/persistent hosting, not ephemeral containers).
const authDir = path.join(__dirname, '..', '..', '..', '.wwebjs_auth', `tenant-${tenantId}`);

let sock;

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // we forward the QR to the parent/dashboard instead
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      process.send({ type: 'qr', tenantId, qr });
    }

    if (connection === 'open') {
      process.send({ type: 'status', tenantId, status: 'connected' });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      process.send({ type: 'status', tenantId, status: loggedOut ? 'disconnected' : 'reconnecting' });
      if (!loggedOut) {
        // Transient disconnect (network blip, restart) — reconnect
        // within this same worker process rather than exiting.
        start().catch(reportCrash);
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const from = msg.key.remoteJid;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';
      if (!text) continue; // skip non-text messages for now (stickers, media without caption, etc.)
      process.send({
        type: 'inbound_message',
        tenantId,
        from,
        displayName: msg.pushName || null,
        text,
      });
    }
  });
}

// Parent asks us to send a message — either an AI-generated reply or a
// system notification (e.g. "your OpenAI key was rejected").
process.on('message', async (parentMsg) => {
  if (parentMsg?.type === 'send' && sock) {
    try {
      await sock.sendMessage(parentMsg.to, { text: parentMsg.text });
      process.send({ type: 'send_ack', to: parentMsg.to, ok: true });
    } catch (err) {
      process.send({ type: 'send_ack', to: parentMsg.to, ok: false, error: err.message });
    }
  }
});

function reportCrash(err) {
  process.send({ type: 'crash', tenantId, error: err?.message || String(err) });
  process.exit(1);
}

process.on('uncaughtException', reportCrash);
process.on('unhandledRejection', reportCrash);

start().catch(reportCrash);
