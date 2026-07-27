/**
 * Minimal structured logger. Intentionally has no "log everything"
 * convenience method that takes an arbitrary object — every call site
 * must name its fields explicitly, which makes it much harder to
 * accidentally log a decrypted API key or a raw request body.
 */
function timestamp() {
  return new Date().toISOString();
}

function info(message, meta = {}) {
  console.log(JSON.stringify({ level: 'info', time: timestamp(), message, ...meta }));
}

function warn(message, meta = {}) {
  console.warn(JSON.stringify({ level: 'warn', time: timestamp(), message, ...meta }));
}

function error(message, meta = {}) {
  console.error(JSON.stringify({ level: 'error', time: timestamp(), message, ...meta }));
}

module.exports = { info, warn, error };
