import { query } from '../db/client.js';

/**
 * One row per conversation, newest activity first, with a preview of
 * the last message so the inbox list doesn't need a second query per
 * row to render something useful.
 */
export async function listConversations(env, ctx, tenantId, { limit = 100, offset = 0 } = {}) {
  const rows = await query(
    env,
    ctx,
    `SELECT
       s.id, s.channel, s.external_user_id, s.display_name, s.last_intent, s.status, s.last_message_at,
       (SELECT m.content FROM messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
       (SELECT m.direction FROM messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_direction
     FROM sessions s
     WHERE s.tenant_id = ?
     ORDER BY s.last_message_at DESC
     LIMIT ? OFFSET ?`,
    [tenantId, Number(limit), Number(offset)]
  );
  return rows;
}

/** Full message transcript for one conversation, oldest first (reading order). */
export async function getConversationMessages(env, ctx, tenantId, sessionId) {
  // tenantId is included in the WHERE clause specifically so one
  // tenant can never fetch another tenant's conversation by guessing
  // a session id — not just relying on the join being "usually" scoped.
  const sessionRows = await query(
    env,
    ctx,
    `SELECT id, channel, external_user_id, display_name, last_intent, status FROM sessions WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [sessionId, tenantId]
  );
  if (sessionRows.length === 0) return null;

  const messages = await query(
    env,
    ctx,
    `SELECT id, direction, content, provider_used, created_at FROM messages WHERE session_id = ? AND tenant_id = ? ORDER BY created_at ASC`,
    [sessionId, tenantId]
  );

  return { session: sessionRows[0], messages };
}
