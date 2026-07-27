const axios = require('axios');
const { ProviderError } = require('./baseAdapter');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Groq's catalog of hosted model IDs changes over time — check
// https://console.groq.com/docs/models for the current list before
// relying on this default in production. This is the LLaMA 3.1 model
// the platform advertises to tenants; override per-request via
// options.model if you need a different one (e.g. a 70B variant).
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

/**
 * Groq exposes an OpenAI-compatible chat completions endpoint, so the
 * request/response shape is nearly identical to the OpenAI adapter.
 */
async function complete(apiKey, messages, options = {}) {
  try {
    const { data } = await axios.post(
      GROQ_URL,
      {
        model: options.model || DEFAULT_MODEL,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: options.timeoutMs || 20000,
      }
    );

    return {
      content: data.choices?.[0]?.message?.content || '',
      raw: data,
      usage: data.usage || null,
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message;
    throw new ProviderError(`Groq request failed: ${message}`, status, err.response?.data);
  }
}

module.exports = { complete, providerName: 'groq' };
