import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionManager, senderNumber, textOf, isPrivateChat } from '../src/sessionManager.js';
import { createApp } from '../src/app.js';
import { sign, verify } from '../src/signature.js';
import { createBackendClient } from '../src/backend.js';
import { verifySignature as backendVerify, signRequest as backendSign } from '../../backend-workers/src/services/waGatewayService.js';
import { createFakeBaileys, tick } from './fakeBaileys.mjs';

let dataDir;
let fake;
let backend;
let manager;
const quiet = { info() {}, warn() {}, error() {} };

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'wa-gw-'));
  fake = createFakeBaileys();
  backend = {
    statuses: [],
    received: [],
    replyWith: (text) => `Auto: ${text}`,
    async status(tenantId, status, phone = null) {
      this.statuses.push({ tenantId: String(tenantId), status, phone });
    },
    async inbound(m) {
      this.received.push(m);
      return this.replyWith(m.text);
    },
  };
  manager = new SessionManager({ baileys: fake, backend, dataDir, logger: quiet, maxQrRefreshes: 3 });
});

afterEach(async () => {
  await manager.shutdown();
  await rm(dataDir, { recursive: true, force: true });
});

async function startWithQr(tenantId = '7') {
  const index = fake.sockets.length;
  const started = manager.start(tenantId, { waitMs: 2000 });
  (await fake.waitForSocket(index)).showQr();
  return started;
}

test('helpers: text, private chats, sender number', () => {
  assert.equal(textOf({ message: { conversation: ' hi ' } }), 'hi');
  assert.equal(textOf({ message: { extendedTextMessage: { text: 'link http://x' } } }), 'link http://x');
  assert.equal(textOf({ message: { ephemeralMessage: { message: { conversation: 'secret' } } } }), 'secret');
  assert.equal(textOf({ message: { imageMessage: { caption: 'this one?' } } }), 'this one?');
  assert.equal(textOf({ message: { stickerMessage: {} } }), '');
  assert.ok(isPrivateChat('8801711111111@s.whatsapp.net'));
  assert.ok(isPrivateChat('123456789@lid'));
  assert.ok(!isPrivateChat('120363@g.us'));
  assert.ok(!isPrivateChat('status@broadcast'));
  assert.ok(!isPrivateChat('1203@newsletter'));
  assert.equal(senderNumber({ remoteJid: '8801711111111@s.whatsapp.net' }), '8801711111111');
  assert.equal(senderNumber({ remoteJid: '99887766@lid', remoteJidAlt: '8801722222222@s.whatsapp.net' }), '8801722222222');
  assert.equal(senderNumber({ remoteJid: '99887766@lid' }), '99887766');
});

test('start shows a QR code, then linking marks the number connected', async () => {
  const state = await startWithQr();
  assert.equal(state.status, 'qr');
  assert.match(state.qr, /^data:image\/png;base64,/);
  assert.deepEqual(backend.statuses.at(-1), { tenantId: '7', status: 'qr', phone: null });

  fake.sockets[0].open('8801799999999');
  await tick();
  const linked = manager.state('7');
  assert.equal(linked.status, 'connected');
  assert.equal(linked.phone, '8801799999999');
  assert.equal(linked.qr, null);
  assert.deepEqual(backend.statuses.at(-1), { tenantId: '7', status: 'connected', phone: '8801799999999' });
  await stat(join(dataDir, 'sessions', '7', 'creds.json'));

  // Starting again while connected does not open a second socket.
  assert.equal((await manager.start('7')).status, 'connected');
  assert.equal(fake.sockets.length, 1);
});

test('a customer message gets the backend reply; groups, own messages, history and duplicates are ignored', async () => {
  await startWithQr();
  const sock = fake.sockets[0];
  sock.open();
  await tick();

  const msg = (id, jid, text, extra = {}) => ({ key: { id, remoteJid: jid, fromMe: false, ...extra }, pushName: 'Rahim', message: { conversation: text } });
  sock.deliver([msg('m1', '8801711111111@s.whatsapp.net', 'price?')]);
  sock.deliver([msg('m1', '8801711111111@s.whatsapp.net', 'price?')]); // duplicate delivery
  sock.deliver([msg('g1', '120363@g.us', 'group chat')]);
  sock.deliver([msg('s1', 'status@broadcast', 'status')]);
  sock.deliver([msg('o1', '8801711111111@s.whatsapp.net', 'my own', { fromMe: true })]);
  sock.deliver([msg('h1', '8801711111111@s.whatsapp.net', 'old history')], 'append');
  sock.deliver([msg('l1', '99887766@lid', 'from a lid chat', { remoteJidAlt: '8801722222222@s.whatsapp.net' })]);
  await tick(50);

  assert.deepEqual(
    backend.received.map((m) => [m.from, m.text, m.name, m.tenantId]),
    [
      ['8801711111111', 'price?', 'Rahim', '7'],
      ['8801722222222', 'from a lid chat', 'Rahim', '7'],
    ]
  );
  assert.deepEqual(
    sock.sent.map((s) => [s.jid, s.text]),
    [
      ['8801711111111@s.whatsapp.net', 'Auto: price?'],
      ['99887766@lid', 'Auto: from a lid chat'],
    ]
  );
  assert.ok(sock.presence.some((p) => p.type === 'composing'));
  assert.equal(sock.read.length, 2);
});

test('replies in one chat keep their order', async () => {
  await startWithQr();
  const sock = fake.sockets[0];
  sock.open();
  await tick();
  let n = 0;
  backend.inbound = async function (m) {
    const delay = ++n === 1 ? 60 : 5; // the first reply is slow
    await tick(delay);
    return `re: ${m.text}`;
  };
  const jid = '8801711111111@s.whatsapp.net';
  sock.deliver([{ key: { id: 'a', remoteJid: jid }, message: { conversation: 'one' } }]);
  sock.deliver([{ key: { id: 'b', remoteJid: jid }, message: { conversation: 'two' } }]);
  await tick(150);
  assert.deepEqual(sock.sent.map((s) => s.text), ['re: one', 're: two']);
});

test('no reply when the backend says stay silent', async () => {
  await startWithQr();
  const sock = fake.sockets[0];
  sock.open();
  await tick();
  backend.replyWith = () => null;
  sock.deliver([{ key: { id: 'x', remoteJid: '8801711111111@s.whatsapp.net' }, message: { conversation: 'hello' } }]);
  await tick();
  assert.equal(backend.received.length, 1);
  assert.equal(sock.sent.length, 0);
});

test('unlinked from the phone: login forgotten, status logged_out', async () => {
  await startWithQr();
  fake.sockets[0].open();
  await tick();
  fake.sockets[0].close(401);
  await tick();
  assert.equal(manager.state('7').status, 'logged_out');
  await assert.rejects(stat(join(dataDir, 'sessions', '7')));
  assert.equal(backend.statuses.at(-1).status, 'logged_out');
});

test('a dropped connection reconnects with the saved login', async () => {
  await startWithQr();
  fake.sockets[0].open();
  await tick();
  fake.sockets[0].close(515); // restartRequired → immediate reconnect
  await fake.waitForSocket(1);
  assert.equal(fake.sockets.length, 2);
  assert.equal(manager.state('7').status, 'connecting');
  fake.sockets[1].open();
  await tick();
  assert.equal(manager.state('7').status, 'connected');
});

test('an unscanned QR stops after a few refreshes instead of looping forever', async () => {
  const p = manager.start('9', { waitMs: 500 });
  const sock = await fake.waitForSocket(0);
  for (let i = 0; i < 4; i++) {
    sock.showQr();
    await tick();
  }
  await p;
  const s = manager.state('9');
  assert.equal(s.status, 'disconnected');
  assert.match(s.lastError, /expired/);
  assert.ok(sock.ended);
});

test('logout unlinks the device and deletes the login', async () => {
  await startWithQr();
  const sock = fake.sockets[0];
  sock.open();
  await tick();
  const state = await manager.logout('7');
  assert.equal(state.status, 'disconnected');
  assert.ok(sock.loggedOut);
  await assert.rejects(stat(join(dataDir, 'sessions', '7')));
});

test('after a restart, linked numbers come back by themselves', async () => {
  await mkdir(join(dataDir, 'sessions', '12'), { recursive: true });
  await writeFile(join(dataDir, 'sessions', '12', 'creds.json'), JSON.stringify({ registered: true }));
  await mkdir(join(dataDir, 'sessions', '13'), { recursive: true }); // never linked: skipped
  const restoring = manager.restoreAll();
  (await fake.waitForSocket(0)).open('8801788888888');
  assert.deepEqual(await restoring, ['12']);
  assert.equal(manager.state('12').status, 'connected');
});

test('send() from the linked number', async () => {
  await assert.rejects(manager.send('7', '8801711111111', 'x'), /not connected/);
  await startWithQr();
  fake.sockets[0].open();
  await tick();
  await manager.send('7', '+880 1711-111111', 'Your order shipped');
  assert.deepEqual(fake.sockets[0].sent.at(-1), { jid: '8801711111111@s.whatsapp.net', text: 'Your order shipped' });
});

// ---------------------------------------------------------------- HTTP API and signatures
test('the HTTP API only answers signed requests', async () => {
  const secret = 'gateway-secret-for-tests';
  const server = createApp({ manager, secret, logger: quiet });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/sessions/7`)).status, 401);
    const badSig = await fetch(`${base}/sessions/7`, { headers: sign('wrong-secret', '') });
    assert.equal(badSig.status, 401);
    const stale = await fetch(`${base}/sessions/7`, { headers: sign(secret, '', Date.now() - 10 * 60 * 1000) });
    assert.equal(stale.status, 401);

    const get = await fetch(`${base}/sessions/7`, { headers: sign(secret, '') });
    assert.equal(get.status, 200);
    assert.equal((await get.json()).status, 'disconnected');

    const startP = fetch(`${base}/sessions/7/start`, { method: 'POST', headers: sign(secret, '{}'), body: '{}' });
    (await fake.waitForSocket(0)).showQr();
    const started = await (await startP).json();
    assert.equal(started.status, 'qr');
    assert.match(started.qr, /^data:image\/png/);

    assert.equal((await fetch(`${base}/sessions/abc`, { headers: sign(secret, '') })).status, 404);
  } finally {
    server.close();
  }
});

test('gateway and backend use the same signature scheme', async () => {
  const raw = JSON.stringify({ tenantId: 1, text: 'hi' });
  const g = sign('shared-secret-123', raw);
  assert.ok(await backendVerify('shared-secret-123', raw, g['x-sf-timestamp'], g['x-sf-signature']));
  const b = await backendSign('shared-secret-123', raw);
  assert.ok(verify('shared-secret-123', raw, b['x-sf-timestamp'], b['x-sf-signature']));
  assert.ok(!verify('other-secret', raw, b['x-sf-timestamp'], b['x-sf-signature']));
});

test('backend client posts signed requests to /api/internal', async () => {
  const seen = [];
  const client = createBackendClient({
    baseUrl: 'https://backend.example/api/',
    secret: 's3cret-s3cret-s3cret',
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ reply: 'Thanks!' }), { status: 200 });
    },
  });
  assert.equal(await client.inbound({ tenantId: '3', from: '880171', name: 'A', text: 'hi', messageId: 'm' }), 'Thanks!');
  assert.equal(seen[0].url, 'https://backend.example/api/internal/whatsapp-qr/inbound');
  assert.ok(verify('s3cret-s3cret-s3cret', seen[0].init.body, seen[0].init.headers['x-sf-timestamp'], seen[0].init.headers['x-sf-signature']));
});
