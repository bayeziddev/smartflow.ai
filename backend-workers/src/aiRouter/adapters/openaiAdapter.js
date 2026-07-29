import { ProviderError } from './baseAdapter.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

export async function complete(apiKey, messages, options = {}) {
  let res;
  try {
    res = await fetch(OPENAI_URL, {
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
    throw new ProviderError(`OpenAI request failed to send: ${err.message}`, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ProviderError(`OpenAI request failed: ${data.error?.message || res.statusText}`, res.status, data);
  }

  return {
    content: data.choices?.[0]?.message?.content || '',
    raw: data,
    usage: data.usage || null,
  };
}

export const providerName = 'openai';
