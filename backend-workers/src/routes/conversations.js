import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import * as conversationService from '../services/conversationService.js';
import { HttpError } from '../httpError.js';

const conversations = new Hono();
conversations.use('*', requireAuth);

conversations.get('/', async (c) => {
  const { limit, offset } = c.req.query();
  const list = await conversationService.listConversations(c.env, c.executionCtx, c.get('tenantId'), { limit, offset });
  return c.json({ conversations: list });
});

conversations.get('/:sessionId/messages', async (c) => {
  const sessionId = c.req.param('sessionId');
  const result = await conversationService.getConversationMessages(c.env, c.executionCtx, c.get('tenantId'), sessionId);
  if (!result) throw new HttpError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  return c.json(result);
});

export default conversations;
