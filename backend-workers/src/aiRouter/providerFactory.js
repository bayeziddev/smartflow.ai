import * as openaiAdapter from './adapters/openaiAdapter.js';
import * as geminiAdapter from './adapters/geminiAdapter.js';
import * as groqAdapter from './adapters/groqAdapter.js';
import * as manusAdapter from './adapters/manusAdapter.js';

const ADAPTERS = { openai: openaiAdapter, gemini: geminiAdapter, groq: groqAdapter, manus: manusAdapter };
export const SUPPORTED_PROVIDERS = Object.keys(ADAPTERS);

export function getAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unknown AI provider "${provider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
  return adapter;
}
