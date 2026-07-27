const { query } = require('../db/pool');
const { encryptSecret, decryptSecret, maskKey } = require('../utils/crypto');
const { SUPPORTED_PROVIDERS } = require('./aiRouter/providerFactory');
const AppError = require('../utils/AppError');

function assertValidProvider(provider) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new AppError(`Unsupported provider "${provider}"`, 400, 'INVALID_PROVIDER');
  }
}

/**
 * Saves (creates or replaces) a tenant's key for a provider. The raw
 * key exists in this function's scope only long enough to encrypt it
 * and compute its preview — it is never returned or logged.
 */
async function saveTenantKey(tenantId, provider, rawApiKey) {
  assertValidProvider(provider);
  if (!rawApiKey || typeof rawApiKey !== 'string' || rawApiKey.trim().length < 8) {
    throw new AppError('API key looks too short to be valid', 400, 'INVALID_KEY_FORMAT');
  }

  const trimmed = rawApiKey.trim();
  const encrypted = encryptSecret(trimmed);
  const preview = maskKey(trimmed);

  await query(
    `INSERT INTO tenant_api_configs (tenant_id, provider, encrypted_api_key, key_preview, is_active, is_valid)
     VALUES (?, ?, ?, ?, 1, 1)
     ON DUPLICATE KEY UPDATE
       encrypted_api_key = VALUES(encrypted_api_key),
       key_preview = VALUES(key_preview),
       is_active = 1,
       is_valid = 1,
       last_error_code = NULL,
       last_error_at = NULL`,
    [tenantId, provider, encrypted, preview]
  );

  // Return ONLY the masked preview — this is the shape the controller
  // is allowed to send back to the frontend.
  return { provider, keyPreview: preview, isActive: true };
}

/**
 * Lists a tenant's configured providers WITHOUT ever decrypting them.
 * This is what powers the settings page — masked previews only.
 */
async function listTenantKeys(tenantId) {
  const rows = await query(
    `SELECT provider, key_preview, is_active, is_valid, last_used_at, last_error_code, last_error_at
     FROM tenant_api_configs WHERE tenant_id = ?`,
    [tenantId]
  );
  return rows.map((r) => ({
    provider: r.provider,
    keyPreview: r.key_preview,
    isActive: !!r.is_active,
    isValid: !!r.is_valid,
    lastUsedAt: r.last_used_at,
    lastErrorCode: r.last_error_code,
    lastErrorAt: r.last_error_at,
  }));
}

async function deleteTenantKey(tenantId, provider) {
  assertValidProvider(provider);
  await query(`DELETE FROM tenant_api_configs WHERE tenant_id = ? AND provider = ?`, [tenantId, provider]);
  return { provider, deleted: true };
}

async function toggleTenantKey(tenantId, provider, isActive) {
  assertValidProvider(provider);
  const result = await query(
    `UPDATE tenant_api_configs SET is_active = ? WHERE tenant_id = ? AND provider = ?`,
    [isActive ? 1 : 0, tenantId, provider]
  );
  if (result.affectedRows === 0) {
    throw new AppError(`No ${provider} key configured for this tenant`, 404, 'CONFIG_NOT_FOUND');
  }
  return { provider, isActive };
}

/**
 * INTERNAL ONLY — decrypts a tenant's key for exactly one outbound AI
 * call. Callers must not persist, log, or return the resolved key.
 * Returns null if the tenant has no active, valid key for this provider.
 */
async function resolveDecryptedKey(tenantId, provider) {
  const rows = await query(
    `SELECT encrypted_api_key FROM tenant_api_configs
     WHERE tenant_id = ? AND provider = ? AND is_active = 1 AND is_valid = 1
     LIMIT 1`,
    [tenantId, provider]
  );
  if (rows.length === 0) return null;
  return decryptSecret(rows[0].encrypted_api_key);
}

async function markKeyUsed(tenantId, provider) {
  await query(`UPDATE tenant_api_configs SET last_used_at = NOW() WHERE tenant_id = ? AND provider = ?`, [
    tenantId,
    provider,
  ]);
}

/**
 * Flips is_valid to 0 after a confirmed 401 so the router stops
 * retrying a dead key on every request, and records the error for
 * display in the dashboard.
 */
async function markKeyError(tenantId, provider, httpStatus) {
  const shouldInvalidate = httpStatus === 401;
  await query(
    `UPDATE tenant_api_configs
     SET last_error_code = ?, last_error_at = NOW() ${shouldInvalidate ? ', is_valid = 0' : ''}
     WHERE tenant_id = ? AND provider = ?`,
    [String(httpStatus), tenantId, provider]
  );
}

module.exports = {
  saveTenantKey,
  listTenantKeys,
  deleteTenantKey,
  toggleTenantKey,
  resolveDecryptedKey,
  markKeyUsed,
  markKeyError,
};
