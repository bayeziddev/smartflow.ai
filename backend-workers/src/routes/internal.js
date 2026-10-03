import { Hono } from 'hono';
import { query } from '../db/client.js';
import * as automationService from '../services/automationService.js';
import * as waGatewayService from '../services/waGatewayService.js';
import { HttpError } from '../httpError.js';

/**
 * Called by the WhatsApp QR gateway (server to server), never by browsers.
 * Every request must carry a valid HMAC signature made with WA_GATEWAY_SECRET.
 */
const internal = new Hono();

internal.use('*', async (c, next) => {
  const raw = await c.req.raw.clone().text();
  const ok = await waGatewayService.verifySignature(
    c.env.WA_GATEWAY_SECRET,
    raw,
    c.req.header('x-sf-timestamp'),
    c.req.header('x-sf-signature')
  );
  if (!ok) throw new HttpError('Bad or missing gateway signature', 401, 'BAD_SIGNATURE');
  c.set('rawBody', raw);
  await next();
});

const STATUS_MAP = { connected: 'connected', qr: 'pending_qr', connecting: 'reconnecting', reconnecting: 'reconnecting', disconnected: 'disconnected', logged_out: 'disconnected', error: 'error' };

/** A customer wrote to the tenant's WhatsApp number. Returns the reply for the gateway to send (null = stay silent). */
internal.post('/whatsapp-qr/inbound', async (c) => {
  const body = JSON.parse(c.get('rawBody') || '{}');
  const tenantId = Number(body.tenantId);
  const from = String(body.from || '').replace(/[^0-9]/g, '');
  const text = String(body.text || '').trim();
  if (!tenantId || !from || !text) throw new HttpError('tenantId, from and text are required', 400, 'INVALID_INPUT');

  const rows = await query(c.env, c.executionCtx, `SELECT is_enabled FROM channel_configs WHERE tenant_id = ? AND channel = 'whatsapp_qr'`, [tenantId]);
  if (!rows[0]?.is_enabled) return c.json({ reply: null, reason: 'channel_disabled' });

  const result = await automationService.handleIncomingMessage(c.env, c.executionCtx, {
    tenantId,
    channel: 'whatsapp_qr',
    externalUserId: from,
    displayName: body.name ? String(body.name).slice(0, 150) : null,
    text: text.slice(0, 4000),
  });
  return c.json({ reply: result.reply, source: result.source });
});

/** The tenant's WhatsApp session changed state (QR shown, linked, logged out…). */
internal.post('/whatsapp-qr/status', async (c) => {
  const body = JSON.parse(c.get('rawBody') || '{}');
  const tenantId = Number(body.tenantId);
  const status = STATUS_MAP[body.status];
  if (!tenantId || !status) throw new HttpError('tenantId and a known status are required', 400, 'INVALID_INPUT');
  const phone = body.phone ? String(body.phone).replace(/[^0-9]/g, '').slice(0, 20) : null;
  await query(
    c.env,
    c.executionCtx,
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status, external_identifier)
     VALUES (?, 'whatsapp_qr', ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), external_identifier = COALESCE(VALUES(external_identifier), external_identifier),
       is_enabled = IF(VALUES(status) = 'connected', 1, is_enabled)`,
    [tenantId, status === 'connected' ? 1 : 0, status, phone]
  );
  return c.json({ ok: true });
});

export default internal;
