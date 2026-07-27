const { query } = require('../db/pool');
const { encryptSecret, decryptSecret, maskKey } = require('../utils/crypto');
const AppError = require('../utils/AppError');

const OFFICIAL_CHANNELS = ['whatsapp', 'messenger'];

function assertOfficialChannel(channel) {
  if (!OFFICIAL_CHANNELS.includes(channel)) {
    throw new AppError(`${channel} does not use token-based credentials`, 400, 'INVALID_CHANNEL');
  }
}

/**
 * Saves a tenant's official WhatsApp Cloud API or Messenger Page
 * credentials. Same encrypt-then-discard-the-plaintext pattern as
 * tenantApiConfigService — the raw access token never touches disk
 * unencrypted and is never echoed back.
 *
 * @param {string} channel 'whatsapp' | 'messenger'
 * @param {object} fields
 * @param {string} fields.accessToken - the secret (WhatsApp permanent
 *   token, or Messenger Page access token)
 * @param {string} fields.externalIdentifier - the non-secret id
 *   (WhatsApp Phone Number ID, or Messenger Page ID)
 * @param {object} [fields.metadata] - other non-secret config
 *   (webhookVerifyToken, businessAccountId, etc)
 */
async function saveChannelCredentials(tenantId, channel, { accessToken, externalIdentifier, metadata = {} }) {
  assertOfficialChannel(channel);
  if (!accessToken || accessToken.trim().length < 8) {
    throw new AppError('Access token looks too short to be valid', 400, 'INVALID_TOKEN_FORMAT');
  }
  if (!externalIdentifier) {
    throw new AppError(
      channel === 'whatsapp' ? 'Phone Number ID is required' : 'Page ID is required',
      400,
      'MISSING_IDENTIFIER'
    );
  }

  const encrypted = encryptSecret(accessToken.trim());

  await query(
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status, external_identifier, encrypted_access_token, metadata_json)
     VALUES (?, ?, 1, 'connected', ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       external_identifier = VALUES(external_identifier),
       encrypted_access_token = VALUES(encrypted_access_token),
       metadata_json = VALUES(metadata_json),
       is_enabled = 1,
       status = 'connected'`,
    [tenantId, channel, externalIdentifier, encrypted, JSON.stringify(metadata)]
  );

  return { channel, externalIdentifier, tokenPreview: maskKey(accessToken.trim()) };
}

/**
 * INTERNAL ONLY — decrypts a tenant's channel access token for exactly
 * one outbound send call. Never persist or log the return value.
 */
async function resolveChannelCredentials(tenantId, channel) {
  assertOfficialChannel(channel);
  const rows = await query(
    `SELECT external_identifier, encrypted_access_token, metadata_json
     FROM channel_configs WHERE tenant_id = ? AND channel = ? AND is_enabled = 1 LIMIT 1`,
    [tenantId, channel]
  );
  if (rows.length === 0 || !rows[0].encrypted_access_token) return null;

  return {
    externalIdentifier: rows[0].external_identifier,
    accessToken: decryptSecret(rows[0].encrypted_access_token),
    metadata: typeof rows[0].metadata_json === 'string' ? JSON.parse(rows[0].metadata_json) : rows[0].metadata_json || {},
  };
}

/**
 * Finds which tenant owns a given webhook verify token, so the shared
 * webhook endpoint (one URL for ALL tenants on a channel) knows whose
 * config to check during Meta's GET verification handshake.
 */
async function findTenantByVerifyToken(channel, verifyToken) {
  assertOfficialChannel(channel);
  const rows = await query(
    `SELECT tenant_id FROM channel_configs
     WHERE channel = ? AND is_enabled = 1 AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.webhookVerifyToken')) = ?
     LIMIT 1`,
    [channel, verifyToken]
  );
  return rows[0]?.tenant_id || null;
}

/**
 * Finds which tenant a given inbound WhatsApp/Messenger message
 * belongs to, keyed by the Phone Number ID / Page ID Meta includes in
 * every webhook payload — this is how one shared webhook URL routes
 * traffic to the right tenant.
 */
async function findTenantByExternalIdentifier(channel, externalIdentifier) {
  assertOfficialChannel(channel);
  const rows = await query(
    `SELECT tenant_id FROM channel_configs
     WHERE channel = ? AND external_identifier = ? AND is_enabled = 1 LIMIT 1`,
    [channel, externalIdentifier]
  );
  return rows[0]?.tenant_id || null;
}

module.exports = {
  saveChannelCredentials,
  resolveChannelCredentials,
  findTenantByVerifyToken,
  findTenantByExternalIdentifier,
};
