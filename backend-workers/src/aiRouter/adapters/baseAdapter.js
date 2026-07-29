export class ProviderError extends Error {
  constructor(message, status, providerRawError = null) {
    super(message);
    this.status = status || 500;
    this.providerRawError = providerRawError;
  }
}
