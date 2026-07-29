const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Verifies the tenant's session JWT (issued at login, either local
 * email/password or after the Manus OAuth callback) and attaches
 * `req.tenantId` for every downstream handler. Every route that
 * touches tenant data — API keys, channels, orders — must sit behind
 * this so one tenant can never read or modify another tenant's rows.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.tenantId = payload.tenantId;
    req.userRole = payload.role;
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired session token', 401, 'UNAUTHENTICATED'));
  }
}

function signSessionToken({ tenantId, role }) {
  return jwt.sign({ tenantId, role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

module.exports = { requireAuth, signSessionToken };
