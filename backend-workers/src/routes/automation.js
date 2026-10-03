import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import * as botSettingsService from '../services/botSettingsService.js';
import * as automationService from '../services/automationService.js';
import { HttpError } from '../httpError.js';

/** The dashboard's Automation page: bot settings, keyword auto-replies, and a test chat. */
const automation = new Hono();
automation.use('*', requireAuth);

automation.get('/settings', async (c) => c.json({ settings: await botSettingsService.getSettings(c.env, c.executionCtx, c.get('tenantId')) }));

automation.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ settings: await botSettingsService.saveSettings(c.env, c.executionCtx, c.get('tenantId'), body) });
});

automation.get('/rules', async (c) => c.json({ rules: await botSettingsService.listRules(c.env, c.executionCtx, c.get('tenantId')) }));

automation.post('/rules', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ rule: await botSettingsService.createRule(c.env, c.executionCtx, c.get('tenantId'), body) }, 201);
});

automation.put('/rules/:id{[0-9]+}', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ rule: await botSettingsService.updateRule(c.env, c.executionCtx, c.get('tenantId'), Number(c.req.param('id')), body) });
});

automation.delete('/rules/:id{[0-9]+}', async (c) =>
  c.json(await botSettingsService.deleteRule(c.env, c.executionCtx, c.get('tenantId'), Number(c.req.param('id'))))
);

/**
 * "Test your bot": runs the exact pipeline a WhatsApp/Messenger customer gets
 * (rules → AI → fallback) and shows which one answered. The conversation is
 * saved under the "test" channel so it appears in Conversations too.
 */
automation.post('/test', async (c) => {
  const { text, sessionKey } = await c.req.json().catch(() => ({}));
  const message = String(text ?? '').trim();
  if (!message) throw new HttpError('Type a message to test', 400, 'INVALID_INPUT');
  if (message.length > 2000) throw new HttpError('That message is too long', 400, 'INVALID_INPUT');
  const result = await automationService.handleIncomingMessage(c.env, c.executionCtx, {
    tenantId: c.get('tenantId'),
    channel: 'test',
    externalUserId: `dashboard-${String(sessionKey || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'default'}`,
    displayName: 'Dashboard test',
    text: message,
  });
  return c.json(result);
});

export default automation;
