import { getAdapter, SUPPORTED_PROVIDERS } from './providerFactory.js';
import * as tenantApiConfigService from '../services/tenantApiConfigService.js';
import { notifyTenant } from '../services/notificationService.js';
import { query } from '../db/client.js';
import { HttpError } from '../httpError.js';

const DEFAULT_FALLBACK_ORDER = ['openai', 'groq', 'gemini', 'manus'];

function buildFallbackChain(primary) {
  return [primary, ...DEFAULT_FALLBACK_ORDER.filter((p) => p !== primary)];
}

async function logUsage(env, ctx, { tenantId, providerRequested, providerUsed, usedPlatformTrialKey, wasFallback, httpStatus, latencyMs }) {
  try {
    await query(
      env,
      ctx,
      `INSERT INTO ai_usage_logs (tenant_id, provider_requested, provider_used, used_platform_trial_key, was_fallback, http_status, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, providerRequested, providerUsed, usedPlatformTrialKey ? 1 : 0, wasFallback ? 1 : 0, httpStatus, latencyMs]
    );
  } catch (err) {
    console.error('ai_usage_log_failed', tenantId, err.message);
  }
}

async function resolveKey(env, ctx, tenantId, provider) {
  const tenantKey = await tenantApiConfigService.resolveDecryptedKey(env, ctx, tenantId, provider);
  if (tenantKey) return { key: tenantKey, source: 'tenant' };

  const allowTrial = String(env.ALLOW_PLATFORM_TRIAL_KEY).toLowerCase() === 'true';
  if (allowTrial) {
    const trialKeyMap = {
      openai: env.OPENAI_TEST_KEY,
      gemini: env.GEMINI_TEST_KEY,
      manus: env.MANUS_TEST_KEY,
      groq: env.GROQ_TEST_KEY,
    };
    const trialKey = trialKeyMap[provider];
    if (trialKey) return { key: trialKey, source: 'platform_trial' };
  }
  return null;
}

/**
 * The single entry point every channel handler calls for an AI reply.
 * @param {object} env Worker env bindings/secrets
 * @param {ExecutionContext} ctx
 * @param {{tenantId:number, provider?:string, messages:object[], options?:object}} params
 */
export async function chat(env, ctx, { tenantId, provider = 'openai', messages, options = {} }) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new HttpError(`Unsupported provider "${provider}"`, 400, 'INVALID_PROVIDER');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError('messages must be a non-empty array', 400, 'INVALID_MESSAGES');
  }

  const chain = options.disableFallback ? [provider] : buildFallbackChain(provider);
  let lastError = null;

  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const wasFallback = i > 0;
    const resolved = await resolveKey(env, ctx, tenantId, candidate);
    if (!resolved) continue;

    const startedAt = Date.now();
    try {
      const adapter = getAdapter(candidate);
      const result = await adapter.complete(resolved.key, messages, options);
      const latencyMs = Date.now() - startedAt;

      await tenantApiConfigService.markKeyUsed(env, ctx, tenantId, candidate);
      await logUsage(env, ctx, {
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

      await logUsage(env, ctx, {
        tenantId,
        providerRequested: provider,
        providerUsed: candidate,
        usedPlatformTrialKey: resolved.source === 'platform_trial',
        wasFallback,
        httpStatus,
        latencyMs,
      });

      if (resolved.source === 'tenant' && (httpStatus === 401 || httpStatus === 429)) {
        await tenantApiConfigService.markKeyError(env, ctx, tenantId, candidate, httpStatus);
        await notifyTenant(env, ctx, tenantId, candidate, httpStatus);
      }
      console.warn('ai_provider_failed', tenantId, candidate, httpStatus, wasFallback);
    }
  }

  throw new HttpError(
    lastError ? `All providers failed. Last error: ${lastError.message}` : 'No AI provider is configured for this tenant.',
    lastError?.status || 424,
    'ALL_PROVIDERS_FAILED'
  );
}
