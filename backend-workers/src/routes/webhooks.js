import { Hono } from 'hono';
import * as channelCredentialService from '../services/channelCredentialService.js';
import * as whatsappCloudHandler from '../channels/whatsappCloudHandler.js';
import * as messengerHandler from '../channels/messengerHandler.js';

const webhooks = new Hono();

webhooks.get('/whatsapp', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode !== 'subscribe' || !token) return c.text('Forbidden', 403);
  const tenantId = await channelCredentialService.findTenantByVerifyToken(c.env, c.executionCtx, 'whatsapp', token);
  if (!tenantId) return c.text('Forbidden', 403);

  return c.text(challenge, 200);
});

webhooks.post('/whatsapp', async (c) => {
  const body = await c.req.json();
  c.executionCtx.waitUntil(
    whatsappCloudHandler.handleWebhookEvent(c.env, c.executionCtx, body).catch((err) => console.error('whatsapp_webhook_failed', err.message))
  );
  return c.text('OK', 200); // ack immediately — Meta disables the webhook after repeated slow/failed responses
});

webhooks.get('/messenger', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode !== 'subscribe' || !token) return c.text('Forbidden', 403);
  const tenantId = await channelCredentialService.findTenantByVerifyToken(c.env, c.executionCtx, 'messenger', token);
  if (!tenantId) return c.text('Forbidden', 403);

  return c.text(challenge, 200);
});

webhooks.post('/messenger', async (c) => {
  const body = await c.req.json();
  c.executionCtx.waitUntil(
    messengerHandler.handleWebhookEvent(c.env, c.executionCtx, body).catch((err) => console.error('messenger_webhook_failed', err.message))
  );
  return c.text('OK', 200);
});

export default webhooks;
