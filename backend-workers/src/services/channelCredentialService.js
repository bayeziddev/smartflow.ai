import { query } from '../db/client.js';
import { encryptSecret, decryptSecret, maskKey } from '../crypto/webCrypto.js';
import { HttpError } from '../httpError.js';

const OFFICIAL_CHANNELS = ['whatsapp', 'messenger'];

function assertOfficialChannel(channel) {
  if (!OFFICIAL_CHANNELS.includes(channel)) {
    throw new HttpError(`${channel} does not use token-based credentials`, 400, 'INVALID_CHANNEL');
  }
}

export async function saveChannelCredentials(env, ctx, tenantId, channel, { accessToken, externalIdentifier, metadata = {} }) {
  assertOfficialChannel(channel);
  if (!accessToken || accessToken.trim().length < 8) {
    throw new HttpError('Access token looks too short to be valid', 400, 'INVALID_TOKEN_FORMAT');
  }
  if (!externalIdentifier) {
    throw new HttpError(channel === 'whatsapp' ? 'Phone Number ID is required' : 'Page ID is required', 400, 'MISSING_IDENTIFIER');
  }

  const encrypted = await encryptSecret(accessToken.trim(), env);

  await query(
    env,
    ctx,
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status, external_identifier, encrypted_access_token, metadata_json)
     VALUES (?, ?, 1, 'connected', ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       external_identifier = VALUES(external_identifier),
       encrypted_access_token = VALUES(encrypted_access_token),
       metadata_json = VALUES(metadata_json),
       is_enabled = 1, status = 'connected'`,
    [tenantId, channel, externalIdentifier, encrypted, JSON.stringify(metadata)]
  );

  return { channel, externalIdentifier, tokenPreview: maskKey(accessToken.trim()) };
}

export async function resolveChannelCredentials(env, ctx, tenantId, channel) {
  assertOfficialChannel(channel);
  const rows = await query(
    env,
    ctx,
    `SELECT external_identifier, encrypted_access_token, metadata_json
     FROM channel_configs WHERE tenant_id = ? AND channel = ? AND is_enabled = 1 LIMIT 1`,
    [tenantId, channel]
  );
  if (rows.length === 0 || !rows[0].encrypted_access_token) return null;

  return {
    externalIdentifier: rows[0].external_identifier,
    accessToken: await decryptSecret(rows[0].encrypted_access_token, env),
    metadata: typeof rows[0].metadata_json === 'string' ? JSON.parse(rows[0].metadata_json) : rows[0].metadata_json || {},
  };
}

export async function findTenantByVerifyToken(env, ctx, channel, verifyToken) {
  assertOfficialChannel(channel);
  const rows = await query(
    env,
    ctx,
    `SELECT tenant_id FROM channel_configs
     WHERE channel = ? AND is_enabled = 1 AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.webhookVerifyToken')) = ?
     LIMIT 1`,
    [channel, verifyToken]
  );
  return rows[0]?.tenant_id || null;
}

export async function findTenantByExternalIdentifier(env, ctx, channel, externalIdentifier) {
  assertOfficialChannel(channel);
  const rows = await query(
    env,
    ctx,
    `SELECT tenant_id FROM channel_configs WHERE channel = ? AND external_identifier = ? AND is_enabled = 1 LIMIT 1`,
    [channel, externalIdentifier]
  );
  return rows[0]?.tenant_id || null;
}
