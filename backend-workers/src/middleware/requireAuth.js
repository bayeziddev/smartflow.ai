import { verify } from 'hono/jwt';
import { HttpError } from '../httpError.js';

export async function requireAuth(c, next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError('Missing or malformed Authorization header', 401, 'UNAUTHENTICATED');

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('tenantId', payload.tenantId);
    c.set('userRole', payload.role);
    await next();
  } catch (err) {
    throw new HttpError('Invalid or expired session token', 401, 'UNAUTHENTICATED');
  }
}
