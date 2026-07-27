#!/usr/bin/env node
/**
 * Integration smoke test against a REAL database — proves the schema
 * and the key-handling / order-idempotency logic work end to end, not
 * just that the code parses. Point it at a throwaway local DB, never
 * at production (it inserts and then deletes a test tenant).
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=youruser DB_PASSWORD=yourpass \
 *   ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('./src/utils/crypto').generateMasterKeyHex())") \
 *   node scripts/integration-test.js
 */
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration_test_secret';
process.env.ALLOW_PLATFORM_TRIAL_KEY = process.env.ALLOW_PLATFORM_TRIAL_KEY || 'false';

if (!process.env.ENCRYPTION_MASTER_KEY) {
  console.error('Set ENCRYPTION_MASTER_KEY before running this (see usage comment at the top of this file).');
  process.exit(1);
}

const { query, getPool } = require('../src/db/pool');
const tenantApiConfigService = require('../src/services/tenantApiConfigService');
const orderService = require('../src/services/orderService');

let failures = 0;
function assert(cond, label) {
  if (cond) {
    console.log(`OK:   ${label}`);
  } else {
    console.error(`FAIL: ${label}`);
    failures += 1;
  }
}

async function main() {
  const tenantUuid = 'test-' + Date.now();
  const insertResult = await query(
    `INSERT INTO users (tenant_uuid, email, password_hash, full_name) VALUES (?, ?, ?, ?)`,
    [tenantUuid, `${tenantUuid}@example.com`, 'x', 'Integration Test Tenant']
  );
  const tenantId = insertResult.insertId;
  assert(tenantId > 0, 'created a test tenant row');

  const fakeKey = 'sk-proj-THIS_SHOULD_NEVER_LEAK_abcdef123456';
  const saveResult = await tenantApiConfigService.saveTenantKey(tenantId, 'openai', fakeKey);
  assert(saveResult.keyPreview !== fakeKey, 'saveTenantKey does not return the raw key');
  assert(saveResult.keyPreview.includes('...'), 'saveTenantKey returns a masked preview');

  const listed = await tenantApiConfigService.listTenantKeys(tenantId);
  const openaiEntry = listed.find((k) => k.provider === 'openai');
  assert(!!openaiEntry, 'listTenantKeys returns the openai config');
  assert(openaiEntry.keyPreview === saveResult.keyPreview, 'listed preview matches saved preview');
  assert(JSON.stringify(listed).indexOf(fakeKey) === -1, 'raw key never appears anywhere in listTenantKeys output');

  const resolved = await tenantApiConfigService.resolveDecryptedKey(tenantId, 'openai');
  assert(resolved === fakeKey, 'resolveDecryptedKey recovers the exact original key for in-memory use');

  await tenantApiConfigService.markKeyError(tenantId, 'openai', 401);
  const afterInvalidate = await tenantApiConfigService.resolveDecryptedKey(tenantId, 'openai');
  assert(afterInvalidate === null, 'a 401 invalidates the key so it is no longer resolved for use');

  const orderPayload = {
    tenantId,
    channel: 'whatsapp',
    customerIdentifier: '8801234567890',
    customerName: 'Test Customer',
    items: [{ name: 'Cold Coffee', quantity: 2 }],
    totalAmount: 9.98,
    currency: 'USD',
    rawMessage: 'yes please confirm 2 cold coffees',
  };
  const first = await orderService.captureOrder(orderPayload);
  const second = await orderService.captureOrder(orderPayload); // exact duplicate
  assert(first.inserted === true, 'first order submission inserts a row');
  assert(second.inserted === false, 'duplicate submission is ignored (idempotency key collision)');

  const orders = await orderService.listOrders(tenantId);
  assert(orders.length === 1, `exactly one order persisted for this tenant (got ${orders.length})`);
  assert(orders[0].items[0].name === 'Cold Coffee', 'order items round-trip correctly through JSON');

  await query('DELETE FROM users WHERE id = ?', [tenantId]); // cascades to configs/orders/sessions

  console.log(failures === 0 ? '\nAll integration checks passed.\n' : `\n${failures} integration check(s) FAILED.\n`);
  await getPool().end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Integration test crashed:', err);
  process.exit(1);
});
