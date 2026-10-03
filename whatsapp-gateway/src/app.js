import { createServer } from 'node:http';
import { verify } from './signature.js';

/**
 * The gateway's HTTP API. Only the SmartFlow backend calls it, and every
 * request except GET /health must carry a valid HMAC signature
 * (see signature.js). Browsers never talk to the gateway directly.
 *
 *   GET  /health                      → { ok, sessions }
 *   POST /sessions/:tenantId/start    → { status, qr, phone, lastError }  (start or resume, returns the QR code)
 *   GET  /sessions/:tenantId          → { status, qr, phone, lastError }
 *   POST /sessions/:tenantId/logout   → unlink the device and forget the login
 *   POST /sessions/:tenantId/send     → { to, text } send a message from the linked number
 */
export function createApp({ manager, secret, logger = console }) {
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const fail = (res, status, code, message) => json(res, status, { error: { code, message } });

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://gateway');
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, sessions: manager.list().length });

      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 64 * 1024) return fail(res, 413, 'TOO_LARGE', 'Request body too large');
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!verify(secret, raw, req.headers['x-sf-timestamp'], req.headers['x-sf-signature'])) {
        return fail(res, 401, 'BAD_SIGNATURE', 'Bad or missing signature');
      }

      const m = url.pathname.match(/^\/sessions\/(\d{1,18})(?:\/(start|logout|send))?$/);
      if (!m) return fail(res, 404, 'NOT_FOUND', `No route for ${req.method} ${url.pathname}`);
      const [, tenantId, action] = m;
      const body = raw ? JSON.parse(raw) : {};

      if (req.method === 'GET' && !action) return json(res, 200, manager.state(tenantId));
      if (req.method === 'POST' && action === 'start') return json(res, 200, await manager.start(tenantId));
      if (req.method === 'POST' && action === 'logout') return json(res, 200, await manager.logout(tenantId));
      if (req.method === 'POST' && action === 'send') {
        if (!body.to || !body.text) return fail(res, 400, 'INVALID_INPUT', 'to and text are required');
        return json(res, 200, await manager.send(tenantId, body.to, body.text));
      }
      return fail(res, 405, 'METHOD_NOT_ALLOWED', `${req.method} is not supported here`);
    } catch (err) {
      logger.error?.({ err: err.message }, 'request failed');
      return fail(res, err.status || 500, err.status ? 'REQUEST_FAILED' : 'INTERNAL_ERROR', err.status ? err.message : 'Something went wrong');
    }
  });
}
