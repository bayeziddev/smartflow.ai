const openaiAdapter = require('./adapters/openaiAdapter');
const geminiAdapter = require('./adapters/geminiAdapter');
const groqAdapter = require('./adapters/groqAdapter');
const manusAdapter = require('./adapters/manusAdapter');

const ADAPTERS = {
  openai: openaiAdapter,
  gemini: geminiAdapter,
  groq: groqAdapter,
  manus: manusAdapter,
};

const SUPPORTED_PROVIDERS = Object.keys(ADAPTERS);

function getAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new Error(`Unknown AI provider "${provider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
  }
  return adapter;
}

module.exports = { getAdapter, SUPPORTED_PROVIDERS };
