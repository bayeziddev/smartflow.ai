import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HttpError } from './httpError.js';

import authRoutes from './routes/auth.js';
import apiConfigRoutes from './routes/apiConfig.js';
import chatRoutes from './routes/chat.js';
import orderRoutes from './routes/orders.js';
import channelRoutes from './routes/channels.js';
import webhookRoutes from './routes/webhooks.js';
import conversationRoutes from './routes/conversations.js';
import adminRoutes from './routes/admin.js';

const app = new Hono();

app.use('*', async (c, next) => {
  const corsMiddleware = cors({ origin: c.env.FRONTEND_URL || '*', credentials: true });
  return corsMiddleware(c, next);
});

app.get('/health', (c) => c.json({ ok: true, service: 'fanchatbot-backend-workers' }));

app.route('/api/auth', authRoutes);
app.route('/api/config', apiConfigRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/channels', channelRoutes);
app.route('/api/conversations', conversationRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/webhooks', webhookRoutes); // no requireAuth — external callers (Meta)

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: `No route for ${c.req.method} ${c.req.path}` } }, 404));

app.onError((err, c) => {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const code = err instanceof HttpError ? err.code : 'INTERNAL_ERROR';
  if (statusCode >= 500) console.error('unhandled_error', c.req.path, err.message, err.stack);
  return c.json({ error: { code, message: err instanceof HttpError ? err.message : 'Something went wrong. Please try again.' } }, statusCode);
});

export default app;
