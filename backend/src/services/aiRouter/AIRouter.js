const { getAdapter, SUPPORTED_PROVIDERS } = require('./providerFactory');
const tenantApiConfigService = require('../tenantApiConfigService');
const notificationService = require('../notificationService');
const { query } = require('../../db/pool');
const { env } = require('../../config/env');
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');

/**
 * Default fallback order when the tenant's requested provider fails.
 * "fallback to LLaMA 3.1 if OpenAI rate-limits" -> groq sits right
 * after openai.
 */
const DEFAULT_FALLBACK_ORDER = ['openai', 'groq', 'gemini', 'xai', 'manus'];

function buildFallbackChain(primary) {
  const rest = DEFAULT_FALLBACK_ORDER.filter((p) => p !== primary);
  return [primary, ...rest];
}

async function logUsage({ tenantId, providerRequested, providerUsed, usedPlatformTrialKey, wasFallback, httpStatus, latencyMs }) {
  try {
    await query(
      `INSERT INTO ai_usage_logs
         (tenant_id, provider_requested, provider_used, used_platform_trial_key, was_fallback, http_status, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, providerRequested, providerUsed, usedPlatformTrialKey ? 1 : 0, wasFallback ? 1 : 0, httpStatus, latencyMs]
    );
  } catch (err) {
    // Never let audit-logging failures break the actual AI response.
    logger.error('ai_usage_log_failed', { tenantId, error: err.message });
  }
}

/**
 * Resolves which key to use for (tenantId, provider):
 *   1. The tenant's own encrypted key, if configured + valid.
 *   2. If ALLOW_PLATFORM_TRIAL_KEY=true and the tenant has none, the
 *      platform's own *_TEST_KEY, purely as an opt-in trial fallback.
 *   3. Otherwise null — this provider is not usable for this tenant.
 */
async function resolveKey(tenantId, provider) {
  const tenantKey = await tenantApiConfigService.resolveDecryptedKey(tenantId, provider);
  if (tenantKey) return { key: tenantKey, source: 'tenant' };

  if (env.allowPlatformTrialKey) {
    const trialKey = env.platformTestKeys[provider];
    if (trialKey) return { key: trialKey, source: 'platform_trial' };
  }
  return null;
}

/**
 * The single entry point every channel handler (WhatsApp, Telegram,
 * Email) calls to get an AI response. Handles key resolution,
 * decryption-in-memory, provider failover, and tenant notification on
 * 401/429 — callers never touch a raw API key.
 *
 * @param {object} params
 * @param {number} params.tenantId
 * @param {string} params.provider - preferred provider, e.g. 'openai'
 * @param {{role:string, content:string}[]} params.messages
 * @param {object} [params.options]
 */
async function chat({ tenantId, provider = 'openai', messages, options = {} }) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new AppError(`Unsupported provider "${provider}"`, 400, 'INVALID_PROVIDER');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AppError('messages must be a non-empty array', 400, 'INVALID_MESSAGES');
  }

  const chain = options.disableFallback ? [provider] : buildFallbackChain(provider);
  let lastError = null;

  for (let i = 0; i < chain.length; i += 1) {
    const candidate = chain[i];
    const wasFallback = i > 0;
    const resolved = await resolveKey(tenantId, candidate);

    if (!resolved) {
      // No usable key for this provider — skip straight to the next
      // candidate without counting it as a provider-side failure.
      continue;
    }

    const startedAt = Date.now();
    try {
      const adapter = getAdapter(candidate);
      const result = await adapter.complete(resolved.key, messages, options);
      const latencyMs = Date.now() - startedAt;

      await tenantApiConfigService.markKeyUsed(tenantId, candidate);
      await logUsage({
        tenantId,
        providerRequested: provider,
        providerUsed: candidate,
        usedPlatformTrialKey: resolved.source === 'platform_trial',
        wasFallback,
        httpStatus: 200,
        latencyMs,
      });

      return {
        content: result.content,
        providerUsed: candidate,
        usedFallback: wasFallback,
        usedPlatformTrialKey: resolved.source === 'platform_trial',
        usage: result.usage,
      };
    } catch (err) {
      const httpStatus = err.status || 500;
      lastError = err;
      const latencyMs = Date.now() - startedAt;

      await logUsage({
        tenantId,
        providerRequested: provider,
        providerUsed: candidate,
        usedPlatformTrialKey: resolved.source === 'platform_trial',
        wasFallback,
        httpStatus,
        latencyMs,
      });

      // Only notify + invalidate for the tenant's OWN key — a
      // platform trial key erroring out is our problem, not theirs.
      if (resolved.source === 'tenant' && (httpStatus === 401 || httpStatus === 429)) {
        await tenantApiConfigService.markKeyError(tenantId, candidate, httpStatus);
        await notificationService.notifyTenant(tenantId, candidate, httpStatus);
      }

      logger.warn('ai_provider_failed', { tenantId, provider: candidate, httpStatus, wasFallback });
      // fall through to the next candidate in the chain
    }
  }

  throw new AppError(
    lastError ? `All providers failed. Last error: ${lastError.message}` : 'No AI provider is configured for this tenant.',
    lastError?.status || 424,
    'ALL_PROVIDERS_FAILED'
  );
}

module.exports = { chat, buildFallbackChain, resolveKey };
