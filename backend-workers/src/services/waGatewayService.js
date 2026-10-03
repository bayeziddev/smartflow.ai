import { HttpError } from '../httpError.js';

/**
 * Talks to the WhatsApp QR gateway (whatsapp-gateway/), the small always-on
 * Node service that holds each tenant's WhatsApp Web session. Cloudflare
 * Workers can't keep that long-lived connection open themselves.
 *
 * Every request in both directions is signed with the shared secret
 * WA_GATEWAY_SECRET: header x-sf-timestamp (unix seconds) and
 * x-sf-signature = hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)).
 * Signatures older than five minutes are rejected, so a captured request
 * can't be replayed later.
 */

const MAX_SKEW_SECONDS = 300;
const encoder = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signRequest(secret, rawBody, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000));
  return { 'x-sf-timestamp': timestamp, 'x-sf-signature': await hmacHex(secret, `${timestamp}.${rawBody}`) };
}

export async function verifySignature(secret, rawBody, timestamp, signature, now = Date.now()) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > MAX_SKEW_SECONDS) return false;
  return timingSafeEqualHex(await hmacHex(secret, `${timestamp}.${rawBody}`), String(signature).toLowerCase());
}

export function isConfigured(env) {
  return Boolean(env.WA_GATEWAY_URL && env.WA_GATEWAY_SECRET);
}

/** Calls the gateway. Throws a 503 HttpError the dashboard can show when it isn't set up or reachable. */
export async function callGateway(env, method, path, body) {
  if (!isConfigured(env)) {
    throw new HttpError(
      'The WhatsApp QR gateway is not set up yet. Deploy whatsapp-gateway/ and set WA_GATEWAY_URL and WA_GATEWAY_SECRET (see whatsapp-gateway/README.md).',
      503,
      'GATEWAY_NOT_CONFIGURED'
    );
  }
  const raw = body === undefined ? '' : JSON.stringify(body);
  const url = `${String(env.WA_GATEWAY_URL).replace(/\/+$/, '')}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...(await signRequest(env.WA_GATEWAY_SECRET, raw)) },
      body: method === 'GET' ? undefined : raw,
    });
  } catch (err) {
    console.error('wa_gateway_unreachable', url, err.message);
    throw new HttpError('Could not reach the WhatsApp QR gateway. Check that it is running.', 503, 'GATEWAY_UNREACHABLE');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HttpError(data?.error?.message || `WhatsApp QR gateway answered ${res.status}`, res.status >= 500 ? 502 : res.status, 'GATEWAY_ERROR');
  }
  return data;
}
