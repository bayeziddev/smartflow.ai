import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import * as AIRouter from '../aiRouter/AIRouter.js';
import { HttpError } from '../httpError.js';

const chat = new Hono();
chat.use('*', requireAuth);

chat.post('/', async (c) => {
  const { provider, messages, options } = await c.req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError('messages must be a non-empty array', 400, 'INVALID_MESSAGES');
  }
  const result = await AIRouter.chat(c.env, c.executionCtx, { tenantId: c.get('tenantId'), provider, messages, options });
  return c.json(result);
});

export default chat;
