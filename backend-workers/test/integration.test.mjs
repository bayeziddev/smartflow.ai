// Integration tests: the real Worker app (src/index.js) against a real MySQL/MariaDB/TiDB database.
// External services (OpenAI, Meta's Graph API, the WhatsApp QR gateway) are replaced by a fetch stub.
//
//   TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=sf TEST_DB_PASSWORD=sfpass npm test
//
// Each run creates a fresh, uniquely named database and drops it at the end.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createConnection } from 'mysql2/promise';
import app from '../src/index.js';
import { resetMigrationState } from '../src/db/migrate.js';
import { signRequest } from '../src/services/waGatewayService.js';

const DB = {
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT || 3306),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '',
};
const DB_NAME = `sf_test_${process.pid}_${Date.now()}`;
const ORIGIN = 'https://chatbot.sayadbayezid.com';
const GATEWAY = 'http://gateway.test';
const GATEWAY_SECRET = 'test-gateway-secret';

const env = {
  DB_HOST: DB.host,
  DB_PORT: String(DB.port),
  DB_USER: DB.user,
  DB_PASSWORD: DB.password,
  DB_DATABASE: DB_NAME,
  DB_SSL: 'false',
  JWT_SECRET: 'test-jwt-secret-0123456789',
  ENCRYPTION_MASTER_KEY: 'a'.repeat(64),
  FRONTEND_URL: `${ORIGIN},https://bayeziddev.github.io`,
  WA_GATEWAY_URL: GATEWAY,
  WA_GATEWAY_SECRET: GATEWAY_SECRET,
};

// ---------------------------------------------------------------- outbound fetch stub
const realFetch = globalThis.fetch;
const calls = [];
let openaiReply = () => ({ status: 200, body: { choices: [{ message: { content: '{"intent":"other","reply":"AI says hi","order":null}' } }] } });
let gatewayReply = () => ({ status: 200, body: { status: 'qr', qr: 'data:image/png;base64,AAAA', phone: null } });

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ url, method: init.method || 'GET', headers: init.headers || {}, body });
  let r;
  if (url.startsWith('https://api.openai.com/')) r = openaiReply(body);
  else if (url.startsWith('https://graph.facebook.com/')) r = { status: 200, body: { messages: [{ id: 'wamid.1' }] } };
  else if (url.startsWith(GATEWAY)) r = gatewayReply(url, body, init);
  else return realFetch(input, init);
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
};

// ---------------------------------------------------------------- helpers
const waits = [];
const ctx = { waitUntil: (p) => waits.push(Promise.resolve(p).catch(() => {})), passThroughOnException() {} };

async function call(path, { method = 'GET', body, token, headers = {}, raw } = {}) {
  const h = { origin: ORIGIN, ...headers };
  if (body !== undefined && raw === undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = `Bearer ${token}`;
  const res = await app.request(path, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) }, env, ctx);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { res, data };
}

async function signedInternal(path, payload, secret = GATEWAY_SECRET) {
  const raw = JSON.stringify(payload);
  return call(path, { method: 'POST', raw, headers: { 'content-type': 'application/json', ...(await signRequest(secret, raw)) } });
}

async function sql(statement, params = []) {
  const conn = await createConnection({ ...DB, database: DB_NAME });
  try {
    const [rows] = await conn.query(statement, params);
    return rows;
  } finally {
    await conn.end();
  }
}

let token;
let tenantId;

before(async () => {
  const conn = await createConnection(DB);
  await conn.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  resetMigrationState();
});

after(async () => {
  await Promise.all(waits);
  const conn = await createConnection(DB);
  await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  await conn.end();
  globalThis.fetch = realFetch;
});

// ---------------------------------------------------------------- custom domain / CORS
test('CORS allows the custom domain and refuses other sites', async () => {
  const ok = await app.request('/api/auth/login', { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } }, env, ctx);
  assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
  const gh = await app.request('/api/auth/login', { method: 'OPTIONS', headers: { origin: 'https://bayeziddev.github.io', 'access-control-request-method': 'POST' } }, env, ctx);
  assert.equal(gh.headers.get('access-control-allow-origin'), 'https://bayeziddev.github.io');
  const bad = await app.request('/api/auth/login', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } }, env, ctx);
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});

test('health check answers without touching the database', async () => {
  const { res, data } = await call('/api/health');
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
});

// ---------------------------------------------------------------- login system
test('register → login → me; the schema is created automatically on first use', async () => {
  const reg = await call('/api/auth/register', { method: 'POST', body: { email: ' Owner@Example.COM ', password: 'secret-pass-1', companyName: 'Demo Shop' } });
  assert.equal(reg.res.status, 201, JSON.stringify(reg.data));
  const tables = (await sql('SHOW TABLES')).map((r) => Object.values(r)[0]);
  for (const t of ['users', 'bot_settings', 'auto_reply_rules', 'schema_migrations', 'messages']) assert.ok(tables.includes(t), t);

  const dup = await call('/api/auth/register', { method: 'POST', body: { email: 'owner@example.com', password: 'another-pass' } });
  assert.equal(dup.res.status, 409);

  const bad = await call('/api/auth/login', { method: 'POST', body: { email: 'owner@example.com', password: 'wrong-pass' } });
  assert.equal(bad.res.status, 401);

  const login = await call('/api/auth/login', { method: 'POST', body: { email: 'OWNER@example.com', password: 'secret-pass-1' } });
  assert.equal(login.res.status, 200);
  token = login.data.token;
  tenantId = login.data.tenantId;

  const me = await call('/api/auth/me', { token });
  assert.equal(me.res.status, 200);
  assert.equal(me.data.user.email, 'owner@example.com');
  assert.equal(me.data.user.companyName, 'Demo Shop');

  assert.equal((await call('/api/auth/me')).res.status, 401);
  assert.equal((await call('/api/auth/me', { token: 'not-a-jwt' })).res.status, 401);
});

test('register validates email and password', async () => {
  assert.equal((await call('/api/auth/register', { method: 'POST', body: { email: 'nope', password: 'secret-pass-1' } })).res.status, 400);
  assert.equal((await call('/api/auth/register', { method: 'POST', body: { email: 'a@b.co', password: 'short' } })).res.status, 400);
  assert.equal((await call('/api/auth/register', { method: 'POST', raw: 'not json', headers: { 'content-type': 'application/json' } })).res.status, 400);
});

test('change password', async () => {
  assert.equal((await call('/api/auth/change-password', { method: 'POST', token, body: { currentPassword: 'wrong', newPassword: 'new-pass-123' } })).res.status, 400);
  assert.equal((await call('/api/auth/change-password', { method: 'POST', token, body: { currentPassword: 'secret-pass-1', newPassword: 'new-pass-123' } })).res.status, 200);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'owner@example.com', password: 'new-pass-123' } })).res.status, 200);
});

test('a route error inside a signed-in request keeps its status (no false "session expired")', async () => {
  const r = await call('/api/channels/whatsapp/credentials', { method: 'POST', token, body: { accessToken: 'x', phoneNumberId: '1' } });
  assert.equal(r.res.status, 400);
  assert.equal(r.data.error.code, 'INVALID_TOKEN_FORMAT');
});

test('switching a channel on and off works', async () => {
  const on = await call('/api/channels/telegram/toggle', { method: 'POST', token, body: { enabled: true } });
  assert.equal(on.res.status, 200, JSON.stringify(on.data));
  const list = await call('/api/channels', { token });
  const tg = list.data.channels.find((c) => c.channel === 'telegram');
  assert.equal(tg.isEnabled, true);
  assert.equal(tg.status, 'pending_setup');
  assert.ok(list.data.channels.some((c) => c.channel === 'whatsapp_qr'));
  await call('/api/channels/telegram/toggle', { method: 'POST', token, body: { enabled: false } });
  assert.equal((await call('/api/channels', { token })).data.channels.find((c) => c.channel === 'telegram').status, 'disconnected');
});

// ---------------------------------------------------------------- automation
test('keyword rules answer without any AI key, in English and Bangla', async () => {
  await call('/api/automation/settings', { method: 'PUT', token, body: { aiEnabled: false, welcomeMessage: 'Welcome! 👋', fallbackMessage: 'We will reply soon.' } });
  const rule = await call('/api/automation/rules', { method: 'POST', token, body: { keywords: 'price, দাম', reply: 'T-shirts are 500 BDT.' } });
  assert.equal(rule.res.status, 201);
  await call('/api/automation/rules', { method: 'POST', token, body: { keywords: 'hi', matchType: 'exact', reply: 'Hello!' } });

  const first = await call('/api/automation/test', { method: 'POST', token, body: { text: 'What is the PRICE?', sessionKey: 'k1' } });
  assert.equal(first.data.source, 'rule');
  assert.equal(first.data.reply, 'Welcome! 👋\n\nT-shirts are 500 BDT.');

  const bn = await call('/api/automation/test', { method: 'POST', token, body: { text: 'শার্টের দাম কত?', sessionKey: 'k1' } });
  assert.equal(bn.data.source, 'rule');
  assert.equal(bn.data.reply, 'T-shirts are 500 BDT.');

  assert.equal((await call('/api/automation/test', { method: 'POST', token, body: { text: 'hi', sessionKey: 'k1' } })).data.reply, 'Hello!');
  const other = await call('/api/automation/test', { method: 'POST', token, body: { text: 'hi, do you deliver?', sessionKey: 'k1' } });
  assert.equal(other.data.source, 'fallback');
  assert.equal(other.data.reply, 'We will reply soon.');
});

test('the AI replies with the business instructions and captures confirmed orders', async () => {
  await call('/api/automation/settings', { method: 'PUT', token, body: { aiEnabled: true, businessName: 'Demo Shop', aiInstructions: 'Free delivery in Dhaka.' } });
  // No key yet → fallback, never silence.
  calls.length = 0;
  const noKey = await call('/api/automation/test', { method: 'POST', token, body: { text: 'do you deliver to Dhaka?', sessionKey: 'k2' } });
  assert.equal(noKey.data.source, 'fallback');
  assert.equal(calls.filter((c) => c.url.includes('openai')).length, 0);

  assert.equal((await call('/api/config/keys', { method: 'POST', token, body: { provider: 'openai', apiKey: 'sk-test-key-123456' } })).res.status, 201);
  openaiReply = () => ({ status: 200, body: { choices: [{ message: { content: '```json\n{"intent":"question","reply":"Yes, delivery in Dhaka is free!","order":null}\n```' } }] } });
  calls.length = 0;
  const ai = await call('/api/automation/test', { method: 'POST', token, body: { text: 'do you deliver to Dhaka?', sessionKey: 'k2' } });
  assert.equal(ai.data.source, 'ai');
  assert.equal(ai.data.reply, 'Yes, delivery in Dhaka is free!');
  const sent = calls.find((c) => c.url.includes('openai')).body;
  assert.match(sent.messages[0].content, /Demo Shop/);
  assert.match(sent.messages[0].content, /Free delivery in Dhaka/);
  // The earlier turn of this conversation is passed as history.
  assert.ok(sent.messages.some((m) => m.role === 'assistant'));
  assert.equal(sent.messages.at(-1).content, 'do you deliver to Dhaka?');

  openaiReply = () => ({ status: 200, body: { choices: [{ message: { content: '{"intent":"order_confirmation","reply":"Order confirmed: 2 T-shirts.","order":{"items":[{"name":"T-shirt","quantity":2}],"totalAmount":1000,"currency":"BDT"}}' } }] } });
  const order = await call('/api/automation/test', { method: 'POST', token, body: { text: 'yes, send 2 T-shirts', sessionKey: 'k2' } });
  assert.equal(order.data.orderCaptured, true);
  const orders = await call('/api/orders', { token });
  assert.equal(orders.res.status, 200, JSON.stringify(orders.data));
  assert.equal(orders.data.orders.length, 1);
  assert.equal(Number(orders.data.orders[0].total_amount), 1000);
});

test('a failing AI key falls back to the fallback message', async () => {
  openaiReply = () => ({ status: 401, body: { error: { message: 'Incorrect API key' } } });
  const r = await call('/api/automation/test', { method: 'POST', token, body: { text: 'tell me something', sessionKey: 'k3' } });
  assert.equal(r.data.source, 'fallback');
  const keys = await call('/api/config/keys', { token });
  assert.equal(keys.data.keys.find((k) => k.provider === 'openai').lastErrorCode, '401');
});

test('a paused bot stays silent but keeps the message', async () => {
  await call('/api/automation/settings', { method: 'PUT', token, body: { isPaused: true } });
  const r = await call('/api/automation/test', { method: 'POST', token, body: { text: 'price?', sessionKey: 'k4' } });
  assert.equal(r.data.reply, null);
  assert.equal(r.data.source, 'paused');
  await call('/api/automation/settings', { method: 'PUT', token, body: { isPaused: false } });
});

test('conversations and order lists load', async () => {
  const conv = await call('/api/conversations', { token });
  assert.equal(conv.res.status, 200, JSON.stringify(conv.data));
  assert.ok(conv.data.conversations.length >= 3);
  const msgs = await call(`/api/conversations/${conv.data.conversations[0].id}/messages`, { token });
  assert.equal(msgs.res.status, 200);
  const csv = await call('/api/orders/export.csv', { token });
  assert.equal(csv.res.status, 200);
  assert.match(String(csv.data), /T-shirt/);
});

// ---------------------------------------------------------------- WhatsApp by QR
test('WhatsApp QR: connect and status go to the gateway with a signed request', async () => {
  calls.length = 0;
  const r = await call('/api/channels/whatsapp_qr/connect', { method: 'POST', token, body: {} });
  assert.equal(r.res.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.status, 'qr');
  const g = calls.find((c) => c.url === `${GATEWAY}/sessions/${tenantId}/start`);
  assert.ok(g, 'called the gateway');
  assert.ok(g.headers['x-sf-signature'] && g.headers['x-sf-timestamp']);
  assert.equal((await call('/api/channels', { token })).data.channels.find((c) => c.channel === 'whatsapp_qr').status, 'pending_qr');

  gatewayReply = () => ({ status: 200, body: { status: 'connected', qr: null, phone: '8801700000000' } });
  const s = await call('/api/channels/whatsapp_qr/status', { token });
  assert.equal(s.data.status, 'connected');
  const ch = (await call('/api/channels', { token })).data.channels.find((c) => c.channel === 'whatsapp_qr');
  assert.equal(ch.status, 'connected');
  assert.equal(ch.externalIdentifier, '8801700000000');
});

test('WhatsApp QR: a customer message from the gateway gets an automated reply', async () => {
  const bad = await signedInternal('/api/internal/whatsapp-qr/inbound', { tenantId, from: '8801711111111', text: 'price?' }, 'wrong-secret');
  assert.equal(bad.res.status, 401);
  const unsigned = await call('/api/internal/whatsapp-qr/inbound', { method: 'POST', body: { tenantId, from: '1', text: 'x' } });
  assert.equal(unsigned.res.status, 401);

  const ok = await signedInternal('/api/internal/whatsapp-qr/inbound', { tenantId, from: '+880 1711-111111', name: 'Rahim', text: 'what is the price' });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.source, 'rule');
  assert.match(ok.data.reply, /500 BDT/);
  const conv = (await call('/api/conversations', { token })).data.conversations.find((c) => c.channel === 'whatsapp_qr');
  assert.equal(conv.external_user_id, '8801711111111');
  assert.equal(conv.display_name, 'Rahim');

  await call('/api/channels/whatsapp_qr/toggle', { method: 'POST', token, body: { enabled: false } });
  const off = await signedInternal('/api/internal/whatsapp-qr/inbound', { tenantId, from: '8801711111111', text: 'price?' });
  assert.equal(off.data.reply, null);
  await call('/api/channels/whatsapp_qr/toggle', { method: 'POST', token, body: { enabled: true } });
});

test('WhatsApp QR: status callbacks and logout', async () => {
  assert.equal((await signedInternal('/api/internal/whatsapp-qr/status', { tenantId, status: 'logged_out' })).res.status, 200);
  assert.equal((await call('/api/channels', { token })).data.channels.find((c) => c.channel === 'whatsapp_qr').status, 'disconnected');
  gatewayReply = () => ({ status: 200, body: { status: 'disconnected', qr: null, phone: null } });
  assert.equal((await call('/api/channels/whatsapp_qr/logout', { method: 'POST', token, body: {} })).res.status, 200);
});

test('WhatsApp QR: a clear message when the gateway is not set up', async () => {
  const r = await app.request('/api/channels/whatsapp_qr/connect', { method: 'POST', headers: { authorization: `Bearer ${token}` } }, { ...env, WA_GATEWAY_URL: '' }, ctx);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error.code, 'GATEWAY_NOT_CONFIGURED');
});

// ---------------------------------------------------------------- official WhatsApp Cloud API webhook
test('WhatsApp Cloud API: an incoming message is answered through the Graph API', async () => {
  const saved = await call('/api/channels/whatsapp/credentials', {
    method: 'POST',
    token,
    body: { accessToken: 'EAAG-test-token-123456', phoneNumberId: '1223636920832591', webhookVerifyToken: 'my-verify' },
  });
  assert.equal(saved.res.status, 201, JSON.stringify(saved.data));

  const verify = await call('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=my-verify&hub.challenge=12345');
  assert.equal(verify.data, 12345);
  assert.equal((await call('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1')).res.status, 403);

  calls.length = 0;
  waits.length = 0;
  const hook = await call('/api/webhooks/whatsapp', {
    method: 'POST',
    body: {
      entry: [{ changes: [{ value: { metadata: { phone_number_id: '1223636920832591' }, contacts: [{ profile: { name: 'Karim' } }], messages: [{ from: '8801722222222', type: 'text', text: { body: 'price please' } }] } }] }],
    },
  });
  assert.equal(hook.res.status, 200);
  await Promise.all(waits);
  const send = calls.find((c) => c.url.includes('graph.facebook.com') && c.url.endsWith('/1223636920832591/messages'));
  assert.ok(send, 'replied through the Graph API');
  assert.equal(send.body.to, '8801722222222');
  assert.match(send.body.text.body, /500 BDT/);
  assert.equal(send.headers.Authorization, 'Bearer EAAG-test-token-123456');
});

// ---------------------------------------------------------------- upgrade path
test('migrations upgrade a database made with the old schema.sql', async () => {
  const name = `${DB_NAME}_old`;
  const conn = await createConnection({ ...DB, multipleStatements: true });
  const fs = await import('node:fs/promises');
  const old = (await fs.readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'))
    .replace(/CREATE DATABASE[^;]*;/, `CREATE DATABASE \`${name}\`;`)
    .replace(/USE fanchatbot;/, `USE \`${name}\`;`);
  await conn.query(old);
  await conn.query(`INSERT INTO \`${name}\`.users (tenant_uuid, email, password_hash) VALUES ('u-1', 'old@example.com', NULL)`);
  try {
    resetMigrationState();
    const oldEnv = { ...env, DB_DATABASE: name };
    const r = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'x@y.z', password: 'whatever1' }) }, oldEnv, ctx);
    assert.equal(r.status, 401);
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${name}\`.channel_configs LIKE 'channel'`);
    assert.match(cols[0].Type, /whatsapp_qr/);
    const [t] = await conn.query(`SHOW TABLES FROM \`${name}\` LIKE 'auto_reply_rules'`);
    assert.equal(t.length, 1);
    const [u] = await conn.query(`SELECT COUNT(*) AS n FROM \`${name}\`.users`);
    assert.equal(Number(u[0].n), 1, 'existing rows are kept');
  } finally {
    await conn.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await conn.end();
    resetMigrationState();
  }
});
