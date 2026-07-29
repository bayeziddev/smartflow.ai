import { query } from '../db/client.js';
import { encryptSecret, decryptSecret, maskKey } from '../crypto/webCrypto.js';
import { SUPPORTED_PROVIDERS } from '../aiRouter/providerFactory.js';
import { HttpError } from '../httpError.js';

function assertValidProvider(provider) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new HttpError(`Unsupported provider "${provider}"`, 400, 'INVALID_PROVIDER');
  }
}

export async function saveTenantKey(env, ctx, tenantId, provider, rawApiKey) {
  assertValidProvider(provider);
  if (!rawApiKey || typeof rawApiKey !== 'string' || rawApiKey.trim().length < 8) {
    throw new HttpError('API key looks too short to be valid', 400, 'INVALID_KEY_FORMAT');
  }

  const trimmed = rawApiKey.trim();
  const encrypted = await encryptSecret(trimmed, env);
  const preview = maskKey(trimmed);

  await query(
    env,
    ctx,
    `INSERT INTO tenant_api_configs (tenant_id, provider, encrypted_api_key, key_preview, is_active, is_valid)
     VALUES (?, ?, ?, ?, 1, 1)
     ON DUPLICATE KEY UPDATE
       encrypted_api_key = VALUES(encrypted_api_key),
       key_preview = VALUES(key_preview),
       is_active = 1, is_valid = 1, last_error_code = NULL, last_error_at = NULL`,
    [tenantId, provider, encrypted, preview]
  );

  return { provider, keyPreview: preview, isActive: true };
}

export async function listTenantKeys(env, ctx, tenantId) {
  const rows = await query(
    env,
    ctx,
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

export async function deleteTenantKey(env, ctx, tenantId, provider) {
  assertValidProvider(provider);
  await query(env, ctx, `DELETE FROM tenant_api_configs WHERE tenant_id = ? AND provider = ?`, [tenantId, provider]);
  return { provider, deleted: true };
}

export async function toggleTenantKey(env, ctx, tenantId, provider, isActive) {
  assertValidProvider(provider);
  const rows = await query(env, ctx, `UPDATE tenant_api_configs SET is_active = ? WHERE tenant_id = ? AND provider = ?`, [
    isActive ? 1 : 0,
    tenantId,
    provider,
  ]);
  if (!rows || rows.affectedRows === 0) {
    throw new HttpError(`No ${provider} key configured for this tenant`, 404, 'CONFIG_NOT_FOUND');
  }
  return { provider, isActive };
}

/** INTERNAL ONLY — decrypted key must never be persisted, logged, or returned. */
export async function resolveDecryptedKey(env, ctx, tenantId, provider) {
  const rows = await query(
    env,
    ctx,
    `SELECT encrypted_api_key FROM tenant_api_configs
     WHERE tenant_id = ? AND provider = ? AND is_active = 1 AND is_valid = 1 LIMIT 1`,
    [tenantId, provider]
  );
  if (rows.length === 0) return null;
  return decryptSecret(rows[0].encrypted_api_key, env);
}

export async function markKeyUsed(env, ctx, tenantId, provider) {
  await query(env, ctx, `UPDATE tenant_api_configs SET last_used_at = NOW() WHERE tenant_id = ? AND provider = ?`, [
    tenantId,
    provider,
  ]);
}

export async function markKeyError(env, ctx, tenantId, provider, httpStatus) {
  const shouldInvalidate = httpStatus === 401;
  await query(
    env,
    ctx,
    `UPDATE tenant_api_configs
     SET last_error_code = ?, last_error_at = NOW() ${shouldInvalidate ? ', is_valid = 0' : ''}
     WHERE tenant_id = ? AND provider = ?`,
    [String(httpStatus), tenantId, provider]
  );
}
