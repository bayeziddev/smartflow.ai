import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import { query } from '../db/client.js';
import * as channelCredentialService from '../services/channelCredentialService.js';
import * as waGatewayService from '../services/waGatewayService.js';
import { HttpError } from '../httpError.js';

const VALID_CHANNELS = ['whatsapp', 'whatsapp_qr', 'telegram', 'messenger', 'email'];

const channels = new Hono();
channels.use('*', requireAuth);

channels.get('/', async (c) => {
  const rows = await query(c.env, c.executionCtx, `SELECT channel, is_enabled, status, external_identifier FROM channel_configs WHERE tenant_id = ?`, [
    c.get('tenantId'),
  ]);
  const byChannel = Object.fromEntries(rows.map((r) => [r.channel, r]));
  const result = VALID_CHANNELS.map((channel) => ({
    channel,
    isEnabled: !!byChannel[channel]?.is_enabled,
    status: byChannel[channel]?.status || 'disconnected',
    externalIdentifier: byChannel[channel]?.external_identifier || null,
  }));
  return c.json({ channels: result, whatsappQrGatewayConfigured: waGatewayService.isConfigured(c.env) });
});

channels.post('/:channel/toggle', async (c) => {
  const channel = c.req.param('channel');
  const { enabled } = await c.req.json();
  if (!VALID_CHANNELS.includes(channel)) throw new HttpError(`Unknown channel "${channel}"`, 400, 'INVALID_CHANNEL');

  await query(
    c.env,
    c.executionCtx,
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled),
       status = CASE WHEN VALUES(is_enabled) = 0 AND status <> 'connected' THEN 'disconnected'
                     WHEN VALUES(is_enabled) = 1 AND status = 'disconnected' THEN 'pending_setup'
                     ELSE status END`,
    [c.get('tenantId'), channel, enabled ? 1 : 0, enabled ? 'pending_setup' : 'disconnected']
  );
  // A connected channel that is switched off keeps its connection (and status) but stops replying;
  // switching it back on resumes replies without reconnecting.

  return c.json({ channel, enabled: !!enabled });
});

channels.post('/:channel/credentials', async (c) => {
  const channel = c.req.param('channel');
  if (!['whatsapp', 'messenger'].includes(channel)) {
    throw new HttpError('Only whatsapp and messenger use this endpoint', 400, 'INVALID_CHANNEL');
  }
  const { accessToken, webhookVerifyToken, phoneNumberId, pageId } = await c.req.json();
  const externalIdentifier = channel === 'whatsapp' ? phoneNumberId : pageId;

  const result = await channelCredentialService.saveChannelCredentials(c.env, c.executionCtx, c.get('tenantId'), channel, {
    accessToken,
    externalIdentifier,
    metadata: { webhookVerifyToken },
  });
  return c.json(result, 201);
});

// ---------------------------------------------------------------- WhatsApp by QR code
// The browser never talks to the gateway directly: these routes check the
// signed-in tenant and proxy to whatsapp-gateway/ with a signed request.

const QR_STATUS_TO_DB = { connected: 'connected', qr: 'pending_qr', connecting: 'reconnecting', disconnected: 'disconnected', logged_out: 'disconnected' };

async function syncQrStatus(c, gatewayState) {
  const status = QR_STATUS_TO_DB[gatewayState?.status];
  if (!status) return;
  const phone = gatewayState.phone ? String(gatewayState.phone).replace(/[^0-9]/g, '').slice(0, 20) : null;
  await query(
    c.env,
    c.executionCtx,
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status, external_identifier) VALUES (?, 'whatsapp_qr', 1, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), external_identifier = COALESCE(VALUES(external_identifier), external_identifier)`,
    [c.get('tenantId'), status, phone]
  );
}

channels.post('/whatsapp_qr/connect', async (c) => {
  const state = await waGatewayService.callGateway(c.env, 'POST', `/sessions/${c.get('tenantId')}/start`, {});
  await query(
    c.env,
    c.executionCtx,
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status) VALUES (?, 'whatsapp_qr', 1, 'pending_qr')
     ON DUPLICATE KEY UPDATE is_enabled = 1, status = IF(status = 'connected', status, 'pending_qr')`,
    [c.get('tenantId')]
  );
  await syncQrStatus(c, state);
  return c.json(state);
});

channels.get('/whatsapp_qr/status', async (c) => {
  const state = await waGatewayService.callGateway(c.env, 'GET', `/sessions/${c.get('tenantId')}`);
  await syncQrStatus(c, state);
  return c.json(state);
});

channels.post('/whatsapp_qr/logout', async (c) => {
  const state = await waGatewayService.callGateway(c.env, 'POST', `/sessions/${c.get('tenantId')}/logout`, {});
  await query(
    c.env,
    c.executionCtx,
    `UPDATE channel_configs SET status = 'disconnected', is_enabled = 0, external_identifier = NULL WHERE tenant_id = ? AND channel = 'whatsapp_qr'`,
    [c.get('tenantId')]
  );
  return c.json(state);
});

export default channels;
