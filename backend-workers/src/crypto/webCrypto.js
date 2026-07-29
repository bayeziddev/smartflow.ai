/**
 * AES-256-GCM via the Web Crypto API (globalThis.crypto.subtle) —
 * runs natively in the Workers runtime, no Node `crypto` module and
 * no nodejs_compat dependency for this specific piece.
 *
 * Storage format: base64(iv) + "." + base64(ciphertext‖authTag)
 * Web Crypto's AES-GCM appends the 16-byte auth tag to the ciphertext
 * automatically (unlike Node's crypto, which returns it separately via
 * getAuthTag()) — that's the one behavioral difference from the
 * Node-based version of this module in backend/src/utils/crypto.js.
 * This is a fresh format for this fresh backend, not required to be
 * byte-compatible with rows encrypted by the Node backend.
 *
 * Design rules — unchanged from the Node version:
 *   1. decryptSecret()'s output must live only in a local variable for
 *      the duration of the outbound API call. Never persist, never
 *      log, never put on a response object.
 *   2. Every stored config keeps only encryptSecret()'s output plus
 *      maskKey()'s output. The masked preview is what the UI may see.
 */

const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Loads the master key from env (set via `wrangler secret put
 * ENCRYPTION_MASTER_KEY`) and imports it as a non-exportable CryptoKey.
 */
async function getMasterKey(env) {
  const raw = env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_MASTER_KEY is not set. Run: wrangler secret put ENCRYPTION_MASTER_KEY');
  }
  const keyBytes = hexToBytes(raw);
  if (keyBytes.length !== KEY_LENGTH_BYTES) {
    throw new Error(`ENCRYPTION_MASTER_KEY must decode to ${KEY_LENGTH_BYTES} bytes (64 hex chars); got ${keyBytes.length}.`);
  }
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** @param {string} plaintext @param {object} env Worker env bindings */
export async function encryptSecret(plaintext, env) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptSecret: plaintext must be a non-empty string');
  }
  const key = await getMasterKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextWithTag = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertextWithTag))}`;
}

/** @param {string} storedPayload @param {object} env */
export async function decryptSecret(storedPayload, env) {
  if (typeof storedPayload !== 'string') throw new Error('decryptSecret: storedPayload must be a string');
  const parts = storedPayload.split('.');
  if (parts.length !== 2) throw new Error('decryptSecret: malformed payload (expected iv.ciphertext)');

  const [ivB64, dataB64] = parts;
  const key = await getMasterKey(env);
  const iv = base64ToBytes(ivB64);
  const ciphertextWithTag = base64ToBytes(dataB64);

  try {
    const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextWithTag);
    return new TextDecoder().decode(plaintextBuf);
  } catch (err) {
    // SubtleCrypto throws OperationError on auth-tag mismatch —
    // tampered/corrupted ciphertext or wrong key.
    throw new Error('decryptSecret: authentication failed (key mismatch or corrupted data)');
  }
}

/** Same masking behavior as the Node version — no plaintext round-trips through here. */
export function maskKey(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length <= 8) return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  return `${plaintext.slice(0, 4)}...${plaintext.slice(-4)}`;
}

/** For local dev / `wrangler secret put` — generates a fresh 32-byte hex key. */
export function generateMasterKeyHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH_BYTES));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
