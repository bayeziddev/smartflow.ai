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
import automationRoutes from './routes/automation.js';
import internalRoutes from './routes/internal.js';
import { ensureSchema } from './db/migrate.js';

const app = new Hono();

/**
 * Which websites may call this API from a browser. FRONTEND_URL is a
 * comma-separated list of origins (scheme + host, no path, no trailing
 * slash) — e.g. "https://chatbot.sayadbayezid.com,https://bayeziddev.github.io".
 * Only the listed origins get CORS headers; Meta's webhooks and the WhatsApp
 * QR gateway call server-to-server and don't need them.
 */
export function allowedOrigins(env) {
  return String(env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

app.use('*', async (c, next) => {
  const allowed = allowedOrigins(c.env);
  const corsMiddleware = cors({
    origin: (origin) => (allowed.length === 0 ? origin || '*' : allowed.includes(origin) ? origin : null),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Disposition'],
    maxAge: 86400,
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.get('/health', (c) => c.json({ ok: true, service: 'fanchatbot-backend-workers' }));
app.get('/api/health', (c) => c.json({ ok: true, service: 'fanchatbot-backend-workers' }));

// New tables / columns are applied automatically on the first API request after a deploy.
app.use('/api/*', ensureSchema);

app.route('/api/auth', authRoutes);
app.route('/api/config', apiConfigRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/channels', channelRoutes);
app.route('/api/conversations', conversationRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/automation', automationRoutes);
app.route('/api/webhooks', webhookRoutes); // no requireAuth — external callers (Meta)
app.route('/api/internal', internalRoutes); // no requireAuth — the WhatsApp QR gateway, HMAC-signed

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: `No route for ${c.req.method} ${c.req.path}` } }, 404));

app.onError((err, c) => {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const code = err instanceof HttpError ? err.code : 'INTERNAL_ERROR';
  if (statusCode >= 500) console.error('unhandled_error', c.req.path, err.message, err.stack);
  return c.json({ error: { code, message: err instanceof HttpError ? err.message : 'Something went wrong. Please try again.' } }, statusCode);
});

export default app;
