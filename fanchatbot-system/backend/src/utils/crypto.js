/**
 * AES-256-GCM encryption utilities for tenant secrets (API keys, OAuth
 * tokens). This is the single module allowed to touch plaintext
 * secrets outside of an outbound provider HTTP call.
 *
 * Storage format (one string, safe for a TEXT column):
 *   base64(iv) . base64(authTag) . base64(ciphertext)
 *
 * Design rules — do not violate these when calling this module:
 *   1. decrypt() output must live only in local variables, in memory,
 *      for the duration of the outbound API call. Never persist it,
 *      never console.log it, never put it on a response object.
 *   2. Every stored config keeps only encrypt()'s output + maskKey()'s
 *      output. The masked preview is what the UI is allowed to see.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // NIST-recommended IV length for GCM
const KEY_LENGTH_BYTES = 32; // 256-bit key
const SEGMENT_DELIMITER = '.';

/**
 * Loads and validates the master key from the environment. Throws
 * loudly at startup/first-use rather than silently encrypting with a
 * bad key.
 */
function getMasterKey() {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY is not set. Generate one with `npm run generate:key` and put it in .env.'
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `ENCRYPTION_MASTER_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes (64 hex characters); got ${key.length}.`
    );
  }
  return key;
}

/**
 * Encrypts a plaintext secret (e.g. a tenant's raw provider API key).
 * @param {string} plaintext
 * @returns {string} storable ciphertext payload
 */
function encryptSecret(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptSecret: plaintext must be a non-empty string');
  }
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    SEGMENT_DELIMITER
  );
}

/**
 * Decrypts a stored payload back to the plaintext secret. Only call
 * this immediately before using the key for an outbound request.
 * @param {string} storedPayload
 * @returns {string} plaintext secret
 */
function decryptSecret(storedPayload) {
  if (typeof storedPayload !== 'string') {
    throw new Error('decryptSecret: storedPayload must be a string');
  }
  const parts = storedPayload.split(SEGMENT_DELIMITER);
  if (parts.length !== 3) {
    throw new Error('decryptSecret: malformed payload (expected iv.authTag.ciphertext)');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (err) {
    // GCM auth-tag mismatch -> tampered/corrupted ciphertext or wrong key.
    throw new Error('decryptSecret: authentication failed (key mismatch or corrupted data)');
  }
}

/**
 * Produces the ONLY representation of a secret that is allowed to
 * reach the frontend: a short, irreversible preview.
 * e.g. "sk-proj-abc123xyz789" -> "sk-p...z789"
 * @param {string} plaintext
 * @returns {string}
 */
function maskKey(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) return '••••••••';
  if (plaintext.length <= 8) return '••••••••';
  const head = plaintext.slice(0, 4);
  const tail = plaintext.slice(-4);
  return `${head}...${tail}`;
}

/**
 * Generates a fresh 32-byte key, hex-encoded, suitable for
 * ENCRYPTION_MASTER_KEY. Used by scripts/generate-encryption-key.js.
 */
function generateMasterKeyHex() {
  return crypto.randomBytes(KEY_LENGTH_BYTES).toString('hex');
}

module.exports = {
  encryptSecret,
  decryptSecret,
  maskKey,
  generateMasterKeyHex,
};
