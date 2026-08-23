import { Hono } from 'hono';
import { query } from '../db/client.js';
import { HttpError } from '../httpError.js';

const leads = new Hono();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public, unauthenticated — this exists specifically to capture people
// who haven't (and may never) create an account. No auth token exists
// for them yet.
leads.post('/', async (c) => {
  const { email, source } = await c.req.json().catch(() => ({}));
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new HttpError('A valid email is required', 400, 'INVALID_INPUT');
  }

  await query(
    c.env,
    c.executionCtx,
    'INSERT INTO leads (email, source) VALUES (?, ?)',
    [email.trim().toLowerCase(), typeof source === 'string' ? source.slice(0, 100) : null]
  );

  return c.json({ ok: true }, 201);
});

export default leads;
