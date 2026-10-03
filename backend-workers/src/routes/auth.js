import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { requireAuth } from '../middleware/requireAuth.js';
import bcrypt from 'bcryptjs';
import { query } from '../db/client.js';
import { HttpError } from '../httpError.js';

const auth = new Hono();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normaliseEmail = (e) => String(e || '').trim().toLowerCase();

async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    throw new HttpError('Request body must be JSON', 400, 'INVALID_INPUT');
  }
}

auth.post('/register', async (c) => {
  const body = await readJson(c);
  const email = normaliseEmail(body.email);
  const { password, companyName, fullName } = body;
  if (!EMAIL_RE.test(email)) throw new HttpError('Enter a valid email address', 400, 'INVALID_INPUT');
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new HttpError('Use a password of at least 8 characters', 400, 'INVALID_INPUT');
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
  return c.json({ token, tenantId: Number(result.insertId) }, 201);
});

auth.post('/login', async (c) => {
  const body = await readJson(c);
  const email = normaliseEmail(body.email);
  const { password } = body;
  if (!email || !password) throw new HttpError('Enter your email and password', 400, 'MISSING_CREDENTIALS');

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
  return c.json({ token, tenantId: Number(user.id) });
});

/** The signed-in account — the dashboard calls this on load to confirm the saved session is still valid. */
auth.get('/me', requireAuth, async (c) => {
  const rows = await query(
    c.env,
    c.executionCtx,
    'SELECT id, email, full_name, company_name, role, plan, is_platform_admin, created_at FROM users WHERE id = ? AND is_active = 1',
    [c.get('tenantId')]
  );
  const u = rows[0];
  if (!u) throw new HttpError('This account no longer exists', 401, 'UNAUTHENTICATED');
  return c.json({
    user: {
      id: Number(u.id),
      email: u.email,
      fullName: u.full_name,
      companyName: u.company_name,
      role: u.role,
      plan: u.plan,
      isPlatformAdmin: !!u.is_platform_admin,
      createdAt: u.created_at,
    },
  });
});

auth.post('/change-password', requireAuth, async (c) => {
  const { currentPassword, newPassword } = await readJson(c);
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new HttpError('Use a new password of at least 8 characters', 400, 'INVALID_INPUT');
  }
  const rows = await query(c.env, c.executionCtx, 'SELECT password_hash FROM users WHERE id = ?', [c.get('tenantId')]);
  if (!rows[0]?.password_hash || !(await bcrypt.compare(String(currentPassword || ''), rows[0].password_hash))) {
    throw new HttpError('Your current password is not correct', 400, 'INVALID_CREDENTIALS');
  }
  await query(c.env, c.executionCtx, 'UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 12), c.get('tenantId')]);
  return c.json({ ok: true });
});

// Manus OAuth ("Sign in with Manus") is intentionally deferred in this
// Workers port — it needs the same authorize/token endpoints as the
// Node backend's authController.js; port that over once you're ready
// to wire OAuth here too. Email/password auth above is fully functional.

export default auth;
