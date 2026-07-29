import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import { query } from '../db/client.js';
import * as channelCredentialService from '../services/channelCredentialService.js';
import { HttpError } from '../httpError.js';

const VALID_CHANNELS = ['whatsapp', 'telegram', 'messenger', 'email'];

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
  return c.json({ channels: result });
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
     ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), status = IF(VALUES(is_enabled) = 0, 'disconnected', status)`,
    [c.get('tenantId'), channel, enabled ? 1 : 0, enabled ? 'pending_setup' : 'disconnected']
  );

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

export default channels;
