import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { query } from '../db/client.js';
import { HttpError } from '../httpError.js';

const auth = new Hono();

auth.post('/register', async (c) => {
  const { email, password, companyName, fullName } = await c.req.json();
  if (!email || !password || password.length < 8) {
    throw new HttpError('email and a password of at least 8 characters are required', 400, 'INVALID_INPUT');
  }

  const existing = await query(c.env, c.executionCtx, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) throw new HttpError('An account with this email already exists', 409, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, 12);
  const tenantUuid = crypto.randomUUID();

  const result = await query(
    c.env,
    c.executionCtx,
    `INSERT INTO users (tenant_uuid, email, password_hash, full_name, company_name) VALUES (?, ?, ?, ?, ?)`,
    [tenantUuid, email, passwordHash, fullName || null, companyName || null]
  );

  const token = await sign(
    { tenantId: result.insertId, role: 'owner', isPlatformAdmin: false, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
    c.env.JWT_SECRET,
    'HS256'
  );
  return c.json({ token, tenantId: result.insertId }, 201);
});

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) throw new HttpError('email and password are required', 400, 'MISSING_CREDENTIALS');

  const rows = await query(
    c.env,
    c.executionCtx,
    'SELECT id, password_hash, role, is_platform_admin FROM users WHERE email = ? AND is_active = 1',
    [email]
  );
  const user = rows[0];
  if (!user || !user.password_hash) throw new HttpError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw new HttpError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const token = await sign(
    {
      tenantId: user.id,
      role: user.role,
      isPlatformAdmin: !!user.is_platform_admin,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    c.env.JWT_SECRET,
    'HS256'
  );
  return c.json({ token, tenantId: user.id });
});

// Manus OAuth ("Sign in with Manus") is intentionally deferred in this
// Workers port — it needs the same authorize/token endpoints as the
// Node backend's authController.js; port that over once you're ready
// to wire OAuth here too. Email/password auth above is fully functional.

export default auth;
