/**
 * Every provider adapter must export:
 *   complete(apiKey, messages, options) -> Promise<{ content, raw, usage }>
 *
 * and must throw an error with a `.status` property set to the
 * upstream HTTP status code on failure (401, 429, 500, ...) so the
 * AIRouter can decide whether to fail over to the next provider and
 * whether to notify the tenant.
 *
 * `messages` is always the OpenAI-style array: [{ role, content }, ...]
 * — adapters are responsible for translating that into whatever shape
 * their provider expects.
 */
class ProviderError extends Error {
  constructor(message, status, providerRawError = null) {
    super(message);
    this.status = status || 500;
    this.providerRawError = providerRawError;
  }
}

module.exports = { ProviderError };
