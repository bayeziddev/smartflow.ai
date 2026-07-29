import { ProviderError } from './baseAdapter.js';

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

export async function complete(apiKey, messages, options = {}) {
  let res;
  try {
    res = await fetch(XAI_URL, {
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
    throw new ProviderError(`xAI (Grok) request failed to send: ${err.message}`, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ProviderError(`xAI (Grok) request failed: ${data.error?.message || res.statusText}`, res.status, data);
  }

  return { content: data.choices?.[0]?.message?.content || '', raw: data, usage: data.usage || null };
}

export const providerName = 'xai';
