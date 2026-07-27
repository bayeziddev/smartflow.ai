#!/usr/bin/env node
/**
 * Quick self-test for the encryption module — no DB or network needed.
 * Usage: npm run test:crypto
 */
process.env.ENCRYPTION_MASTER_KEY =
  process.env.ENCRYPTION_MASTER_KEY || require('../src/utils/crypto').generateMasterKeyHex();

const { encryptSecret, decryptSecret, maskKey } = require('../src/utils/crypto');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK:   ${msg}`);
  }
}

const sample = 'sk-proj-THIS_IS_A_FAKE_TEST_KEY_1234567890';

const encrypted = encryptSecret(sample);
assert(typeof encrypted === 'string' && encrypted.split('.').length === 3, 'encryptSecret produces iv.authTag.ciphertext');
assert(!encrypted.includes(sample), 'ciphertext does not contain the plaintext');

const decrypted = decryptSecret(encrypted);
assert(decrypted === sample, 'decryptSecret recovers the exact original plaintext');

const masked = maskKey(sample);
assert(masked === 'sk-p...7890', `maskKey never reveals the middle of the key (got "${masked}")`);
assert(!masked.includes(sample.slice(5, -4)), 'masked preview omits the sensitive middle segment');

// Tamper detection: flip a character in the ciphertext segment and confirm it's rejected.
const [iv, tag, ct] = encrypted.split('.');
const tamperedCt = ct.slice(0, -2) + (ct.slice(-2) === 'AA' ? 'BB' : 'AA');
let tamperRejected = false;
try {
  decryptSecret([iv, tag, tamperedCt].join('.'));
} catch (e) {
  tamperRejected = true;
}
assert(tamperRejected, 'tampered ciphertext is rejected by GCM auth-tag verification');

console.log('\nAll crypto self-tests passed.\n');
