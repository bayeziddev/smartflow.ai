import { ProviderError } from './baseAdapter.js';

const DEFAULT_MODEL = 'gemini-1.5-flash';

function toGeminiPayload(messages) {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const payload = { contents: turns };
  if (systemMessages.length > 0) payload.systemInstruction = { parts: [{ text: systemMessages.join('\n') }] };
  return payload;
}

export async function complete(apiKey, messages, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(toGeminiPayload(messages)),
    });
  } catch (err) {
    throw new ProviderError(`Gemini request failed to send: ${err.message}`, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ProviderError(`Gemini request failed: ${data.error?.message || res.statusText}`, res.status, data);
  }

  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return { content, raw: data, usage: data.usageMetadata || null };
}

export const providerName = 'gemini';
