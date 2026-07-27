import { query } from '../db/client.js';

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function computeIdempotencyKey({ tenantId, channel, customerIdentifier, itemsJson, rawMessage }) {
  const basis = JSON.stringify({ tenantId, channel, customerIdentifier, itemsJson, rawMessage });
  return sha256Hex(basis);
}

export async function captureOrder(env, ctx, { tenantId, sessionId, channel, customerIdentifier, customerName, items, totalAmount, currency, rawMessage }) {
  const itemsJson = JSON.stringify(items);
  const idempotencyKey = await computeIdempotencyKey({ tenantId, channel, customerIdentifier, itemsJson, rawMessage });

  const result = await query(
    env,
    ctx,
    `INSERT IGNORE INTO orders
       (tenant_id, session_id, idempotency_key, channel, customer_identifier, customer_name, items_json, total_amount, currency, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, sessionId || null, idempotencyKey, channel, customerIdentifier, customerName || null, itemsJson, totalAmount ?? null, currency || 'USD', rawMessage || null]
  );

  return { inserted: result.affectedRows > 0, idempotencyKey };
}

export async function listOrders(env, ctx, tenantId, { status, limit = 200, offset = 0 } = {}) {
  const clauses = ['tenant_id = ?'];
  const params = [tenantId];
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  params.push(Number(limit), Number(offset));

  const rows = await query(
    env,
    ctx,
    `SELECT id, channel, customer_identifier, customer_name, items_json, total_amount, currency, status, created_at
     FROM orders WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    params
  );

  return rows.map((r) => ({ ...r, items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json }));
}

export async function markOrdersExported(env, ctx, orderIds) {
  if (orderIds.length === 0) return;
  await query(env, ctx, `UPDATE orders SET status = 'exported', exported_at = NOW() WHERE id IN (?)`, [orderIds]);
}
