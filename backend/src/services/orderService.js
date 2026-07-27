const crypto = require('crypto');
const { query } = require('../db/pool');

/**
 * Deterministic idempotency key so a retried webhook delivery or a
 * duplicate AI extraction on the same message can never create two
 * rows for the same order — this is what schema.sql's
 * `orders.idempotency_key` UNIQUE constraint enforces at the DB layer.
 */
function computeIdempotencyKey({ tenantId, channel, customerIdentifier, itemsJson, rawMessage }) {
  const basis = JSON.stringify({ tenantId, channel, customerIdentifier, itemsJson, rawMessage });
  return crypto.createHash('sha256').update(basis).digest('hex');
}

/**
 * Called by the automation layer once the AI Router has confirmed
 * "order confirmation" intent and extracted structured line items.
 * Safe to call more than once with the same underlying message.
 */
async function captureOrder({ tenantId, sessionId, channel, customerIdentifier, customerName, items, totalAmount, currency, rawMessage }) {
  const itemsJson = JSON.stringify(items);
  const idempotencyKey = computeIdempotencyKey({ tenantId, channel, customerIdentifier, itemsJson, rawMessage });

  const result = await query(
    `INSERT IGNORE INTO orders
       (tenant_id, session_id, idempotency_key, channel, customer_identifier, customer_name, items_json, total_amount, currency, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      sessionId || null,
      idempotencyKey,
      channel,
      customerIdentifier,
      customerName || null,
      itemsJson,
      totalAmount ?? null,
      currency || 'USD',
      rawMessage || null,
    ]
  );

  return { inserted: result.affectedRows > 0, idempotencyKey };
}

async function listOrders(tenantId, { status, limit = 200, offset = 0 } = {}) {
  const clauses = ['tenant_id = ?'];
  const params = [tenantId];
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  params.push(Number(limit), Number(offset));

  const rows = await query(
    `SELECT id, channel, customer_identifier, customer_name, items_json, total_amount, currency, status, created_at
     FROM orders WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    params
  );

  // mysql2 auto-parses native JSON columns into JS objects already —
  // only JSON.parse if we somehow got a raw string back (e.g. a
  // different driver config), so this stays correct either way.
  return rows.map((r) => ({
    ...r,
    items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json,
  }));
}

async function markOrdersExported(orderIds) {
  if (orderIds.length === 0) return;
  await query(`UPDATE orders SET status = 'exported', exported_at = NOW() WHERE id IN (?)`, [orderIds]);
}

module.exports = { captureOrder, listOrders, markOrdersExported, computeIdempotencyKey };
