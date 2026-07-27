const axios = require('axios');
const { ProviderError } = require('./baseAdapter');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * @param {string} apiKey - decrypted, in-memory only
 * @param {{role:string, content:string}[]} messages
 * @param {object} options - { model, temperature, maxTokens }
 */
async function complete(apiKey, messages, options = {}) {
  try {
    const { data } = await axios.post(
      OPENAI_URL,
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
    throw new ProviderError(`OpenAI request failed: ${message}`, status, err.response?.data);
  }
}

module.exports = { complete, providerName: 'openai' };
