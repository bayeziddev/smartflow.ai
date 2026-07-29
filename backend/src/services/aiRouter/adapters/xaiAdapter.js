const axios = require('axios');
const { ProviderError } = require('./baseAdapter');

// ---------------------------------------------------------------------
// xAI's Grok models. NOT the same company as Groq (the fast-inference
// provider serving Llama, already wired in as the 'groq' adapter) —
// xAI is Elon Musk's company, Grok is their own model family. The
// names sound identical; the products are unrelated. Keep this
// comment — the mix-up is easy to make again later.
// ---------------------------------------------------------------------

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
// xAI ships new Grok versions frequently — check https://docs.x.ai
// before relying on this default in production.
const DEFAULT_MODEL = 'grok-4.5';

async function complete(apiKey, messages, options = {}) {
  try {
    const { data } = await axios.post(
      XAI_URL,
      {
        model: options.model || DEFAULT_MODEL,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1024,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: options.timeoutMs || 20000,
      }
    );

    return { content: data.choices?.[0]?.message?.content || '', raw: data, usage: data.usage || null };
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message;
    throw new ProviderError(`xAI (Grok) request failed: ${message}`, status, err.response?.data);
  }
}

module.exports = { complete, providerName: 'xai' };
