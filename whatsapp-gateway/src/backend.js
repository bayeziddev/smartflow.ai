import { sign } from './signature.js';

/** Signed calls from the gateway to the SmartFlow backend (backend-workers/src/routes/internal.js). */
export function createBackendClient({ baseUrl, secret, fetchImpl = fetch, logger = console }) {
  const root = String(baseUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');

  async function post(path, payload) {
    const raw = JSON.stringify(payload);
    const res = await fetchImpl(`${root}/api/internal${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...sign(secret, raw) },
      body: raw,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error?.message || `backend answered ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    /** Returns the reply text to send back, or null when the bot should stay silent. */
    async inbound({ tenantId, from, name, text, messageId }) {
      const data = await post('/whatsapp-qr/inbound', { tenantId: Number(tenantId), from, name, text, messageId });
      return data.reply ?? null;
    },
    async status(tenantId, status, phone = null) {
      try {
        await post('/whatsapp-qr/status', { tenantId: Number(tenantId), status, phone });
      } catch (err) {
        logger.warn?.({ tenantId, status, err: err.message }, 'backend status update failed');
      }
    },
  };
}
