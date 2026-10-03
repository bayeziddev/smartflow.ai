import { verify } from 'hono/jwt';
import { HttpError } from '../httpError.js';

export async function requireAuth(c, next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError('Missing or malformed Authorization header', 401, 'UNAUTHENTICATED');

  let payload;
  try {
    payload = await verify(token, c.env.JWT_SECRET, 'HS256');
  } catch (err) {
    throw new HttpError('Invalid or expired session token', 401, 'UNAUTHENTICATED');
  }
  c.set('tenantId', payload.tenantId);
  c.set('userRole', payload.role);
  c.set('isPlatformAdmin', !!payload.isPlatformAdmin);
  // Outside the try: an error thrown by the route itself (e.g. a 400 for a
  // bad field) must reach the client as that error, not as "session
  // expired" — which also made the dashboard sign the user out.
  await next();
}
