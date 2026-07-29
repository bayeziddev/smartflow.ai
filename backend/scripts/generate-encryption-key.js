#!/usr/bin/env node
/**
 * Prints a fresh ENCRYPTION_MASTER_KEY value. Run once per environment
 * (dev, staging, prod each get their own) and paste the output into
 * that environment's .env — never reuse the same key across environments.
 *
 * Usage: npm run generate:key
 */
const { generateMasterKeyHex } = require('../src/utils/crypto');

const key = generateMasterKeyHex();
console.log('\nGenerated ENCRYPTION_MASTER_KEY (32 bytes, hex-encoded):\n');
console.log(key);
console.log('\nAdd this to your .env as:\n');
console.log(`ENCRYPTION_MASTER_KEY=${key}\n`);
console.log('Keep it secret. Losing it makes every stored tenant API key unrecoverable.');
console.log('Rotating it requires decrypting all rows with the old key and re-encrypting with the new one.\n');
