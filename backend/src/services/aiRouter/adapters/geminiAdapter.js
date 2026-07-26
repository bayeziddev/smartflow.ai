const axios = require('axios');
const { ProviderError } = require('./baseAdapter');

const DEFAULT_MODEL = 'gemini-1.5-flash';

/**
 * Converts OpenAI-style messages into Gemini's `contents` + optional
 * `systemInstruction` shape. Gemini uses "model" instead of
 * "assistant" for the AI turn.
 */
function toGeminiPayload(messages) {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const payload = { contents: turns };
  if (systemMessages.length > 0) {
    payload.systemInstruction = { parts: [{ text: systemMessages.join('\n') }] };
  }
  return payload;
}

async function complete(apiKey, messages, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const { data } = await axios.post(url, toGeminiPayload(messages), {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      timeout: options.timeoutMs || 20000,
    });

    const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

    return {
      content,
      raw: data,
      usage: data.usageMetadata || null,
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message;
    throw new ProviderError(`Gemini request failed: ${message}`, status, err.response?.data);
  }
}

module.exports = { complete, providerName: 'gemini' };