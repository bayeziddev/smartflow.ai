import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Same scheme as backend-workers/src/services/waGatewayService.js:
 *   x-sf-timestamp = unix seconds
 *   x-sf-signature = hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))
 * Requests older than five minutes are refused (no replays).
 */
const MAX_SKEW_SECONDS = 300;

export function sign(secret, rawBody, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return { 'x-sf-timestamp': timestamp, 'x-sf-signature': signature };
}

export function verify(secret, rawBody, timestamp, signature, now = Date.now()) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > MAX_SKEW_SECONDS) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'));
  const given = Buffer.from(String(signature).toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}
