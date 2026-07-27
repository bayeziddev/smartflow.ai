const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const { query } = require('../db/pool');
const { signSessionToken } = require('../middleware/requireAuth');
const { encryptSecret } = require('../utils/crypto');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------
// Local auth (email + password) — the baseline that always works, even
// before Manus OAuth app credentials are configured.
// ---------------------------------------------------------------------

async function register(req, res, next) {
  try {
    const { email, password, companyName, fullName } = req.body;
    if (!email || !password || password.length < 8) {
      throw new AppError('email and a password of at least 8 characters are required', 400, 'INVALID_INPUT');
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const tenantUuid = crypto.randomUUID();

    const result = await query(
      `INSERT INTO users (tenant_uuid, email, password_hash, full_name, company_name)
       VALUES (?, ?, ?, ?, ?)`,
      [tenantUuid, email, passwordHash, fullName || null, companyName || null]
    );

    const token = signSessionToken({ tenantId: result.insertId, role: 'owner' });
    res.status(201).json({ token, tenantId: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    const rows = await query('SELECT id, password_hash, role FROM users WHERE email = ? AND is_active = 1', [email]);
    const user = rows[0];
    if (!user || !user.password_hash) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = signSessionToken({ tenantId: user.id, role: user.role });
    res.json({ token, tenantId: user.id });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------
// "Sign in with Manus" — standard OAuth2 authorization-code flow using
// the Open App credentials registered at https://open.manus.ai.
//
// VERIFY BEFORE PRODUCTION: the authorize/token endpoint URLs below
// follow the conventional OAuth2 shape Manus's docs describe (Bearer
// access tokens, scoped, team-based apps) but the exact paths should
// be confirmed against your app's entry in the Manus developer
// dashboard — treat MANUS_AUTHORIZE_URL / MANUS_TOKEN_URL as the two
// values to double-check first if this callback ever 404s.
// ---------------------------------------------------------------------
const MANUS_AUTHORIZE_URL = 'https://open.manus.ai/oauth/authorize';
const MANUS_TOKEN_URL = 'https://open.manus.ai/oauth/token';

function manusLogin(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  // In production, store `state` (e.g. in a short-lived cookie or
  // server-side cache) and verify it on callback to prevent CSRF.
  const params = new URLSearchParams({
    client_id: env.manusOAuth.clientId,
    redirect_uri: env.manusOAuth.redirectUri,
    response_type: 'code',
    scope: 'profile create_task',
    state,
  });
  res.redirect(`${MANUS_AUTHORIZE_URL}?${params.toString()}`);
}

async function manusCallback(req, res, next) {
  try {
    const { code } = req.query;
    if (!code) throw new AppError('Missing authorization code from Manus', 400, 'OAUTH_NO_CODE');

    const { data } = await axios.post(MANUS_TOKEN_URL, {
      grant_type: 'authorization_code',
      code,
      client_id: env.manusOAuth.clientId,
      client_secret: env.manusOAuth.clientSecret,
      redirect_uri: env.manusOAuth.redirectUri,
    });

    const { access_token, refresh_token, expires_in, manus_user_id, email, full_name } = data;
    if (!access_token || !manus_user_id) {
      throw new AppError('Unexpected response from Manus token endpoint', 502, 'OAUTH_BAD_RESPONSE');
    }

    const encryptedAccess = encryptSecret(access_token);
    const encryptedRefresh = refresh_token ? encryptSecret(refresh_token) : null;
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    const existing = await query('SELECT id FROM users WHERE manus_user_id = ?', [manus_user_id]);
    let tenantId;
    if (existing.length > 0) {
      tenantId = existing[0].id;
      await query(
        `UPDATE users SET manus_access_token = ?, manus_refresh_token = ?, manus_token_expires_at = ? WHERE id = ?`,
        [encryptedAccess, encryptedRefresh, expiresAt, tenantId]
      );
    } else {
      const tenantUuid = crypto.randomUUID();
      const result = await query(
        `INSERT INTO users (tenant_uuid, email, full_name, manus_user_id, manus_access_token, manus_refresh_token, manus_token_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenantUuid, email || `${manus_user_id}@manus.local`, full_name || null, manus_user_id, encryptedAccess, encryptedRefresh, expiresAt]
      );
      tenantId = result.insertId;
    }

    const token = signSessionToken({ tenantId, role: 'owner' });
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    logger.error('manus_oauth_callback_failed', { message: err.message });
    next(err);
  }
}

module.exports = { register, login, manusLogin, manusCallback };
