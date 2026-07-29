import { encryptSecret, decryptSecret, maskKey, generateMasterKeyHex } from '../src/crypto/webCrypto.js';

const env = { ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY || generateMasterKeyHex() };

let failures = 0;
function assert(cond, label) {
  if (cond) console.log(`OK:   ${label}`);
  else { console.error(`FAIL: ${label}`); failures++; }
}

async function main() {
  const sample = 'sk-proj-THIS_IS_A_FAKE_TEST_KEY_1234567890';

  const encrypted = await encryptSecret(sample, env);
  assert(typeof encrypted === 'string' && encrypted.split('.').length === 2, 'encryptSecret produces iv.ciphertext');
  assert(!encrypted.includes(sample), 'ciphertext does not contain the plaintext');

  const decrypted = await decryptSecret(encrypted, env);
  assert(decrypted === sample, 'decryptSecret recovers the exact original plaintext');

  const masked = maskKey(sample);
  assert(masked === 'sk-p...7890', `maskKey never reveals the middle (got "${masked}")`);

  // Tamper detection
  const [iv, data] = encrypted.split('.');
  const tamperedData = data.slice(0, -2) + (data.slice(-2) === 'AA' ? 'BB' : 'AA');
  let tamperRejected = false;
  try {
    await decryptSecret(`${iv}.${tamperedData}`, env);
  } catch (e) {
    tamperRejected = true;
  }
  assert(tamperRejected, 'tampered ciphertext is rejected (Web Crypto auth-tag check)');

  // Wrong key rejected
  const wrongEnv = { ENCRYPTION_MASTER_KEY: generateMasterKeyHex() };
  let wrongKeyRejected = false;
  try {
    await decryptSecret(encrypted, wrongEnv);
  } catch (e) {
    wrongKeyRejected = true;
  }
  assert(wrongKeyRejected, 'decrypting with the wrong master key is rejected');

  console.log(failures === 0 ? '\nAll Web Crypto self-tests passed.\n' : `\n${failures} FAILED\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Test crashed:', e);
  process.exit(1);
});
