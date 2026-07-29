import { ProviderError } from './baseAdapter.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Check https://console.groq.com/docs/models before relying on this in production.
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

export async function complete(apiKey, messages, options = {}) {
  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || DEFAULT_MODEL,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });
  } catch (err) {
    throw new ProviderError(`Groq request failed to send: ${err.message}`, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ProviderError(`Groq request failed: ${data.error?.message || res.statusText}`, res.status, data);
  }

  return { content: data.choices?.[0]?.message?.content || '', raw: data, usage: data.usage || null };
}

export const providerName = 'groq';
