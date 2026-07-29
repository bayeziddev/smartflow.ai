import { HttpError } from '../httpError.js';

/**
 * Gates a route to the platform owner only. Must run AFTER
 * requireAuth (needs c.get('isPlatformAdmin'), which requireAuth sets
 * from the verified JWT). A regular tenant hitting one of these routes
 * gets a 403, not a 404 — there's nothing to hide about the route
 * existing, only about what it returns.
 */
export async function requireAdmin(c, next) {
  if (!c.get('isPlatformAdmin')) {
    throw new HttpError('This area is for the platform owner only.', 403, 'ADMIN_ONLY');
  }
  await next();
}
