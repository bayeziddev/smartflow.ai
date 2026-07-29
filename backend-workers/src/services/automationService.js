import * as AIRouter from '../aiRouter/AIRouter.js';
import * as orderService from './orderService.js';
import { query } from '../db/client.js';

const EXTRACTION_SYSTEM_PROMPT = `You are an order-intake assistant for a small business chatbot.
Read the customer's message and reply with ONLY a JSON object (no prose, no markdown fences) matching exactly this shape:
{
  "intent": "order_confirmation" | "question" | "greeting" | "other",
  "reply": "<a short, friendly reply to send back to the customer>",
  "order": { "items": [{ "name": "string", "quantity": number }], "totalAmount": number, "currency": "string" } | null
}
Only populate "order" when intent is "order_confirmation" AND the message clearly confirms specific item(s) to buy.
If unsure, use intent "other" and leave "order" null.`;

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
  } catch {
    return null;
  }
}

async function getOrCreateSession(env, ctx, tenantId, channel, externalUserId, displayName) {
  await query(
    env,
    ctx,
    `INSERT INTO sessions (tenant_id, channel, external_user_id, display_name, last_message_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_message_at = NOW(), display_name = COALESCE(VALUES(display_name), display_name)`,
    [tenantId, channel, externalUserId, displayName || null]
  );
  const rows = await query(env, ctx, `SELECT id FROM sessions WHERE tenant_id = ? AND channel = ? AND external_user_id = ?`, [
    tenantId,
    channel,
    externalUserId,
  ]);
  return rows[0].id;
}

async function saveMessage(env, ctx, { tenantId, sessionId, direction, content, providerUsed }) {
  await query(
    env,
    ctx,
    `INSERT INTO messages (tenant_id, session_id, direction, content, provider_used) VALUES (?, ?, ?, ?, ?)`,
    [tenantId, sessionId, direction, content, providerUsed || null]
  );
}

export async function handleIncomingMessage(env, ctx, { tenantId, channel, externalUserId, displayName, text, preferredProvider }) {
  const sessionId = await getOrCreateSession(env, ctx, tenantId, channel, externalUserId, displayName);
  await saveMessage(env, ctx, { tenantId, sessionId, direction: 'inbound', content: text });

  const aiResult = await AIRouter.chat(env, ctx, {
    tenantId,
    provider: preferredProvider || 'openai',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  });

  const parsed = safeParseJson(aiResult.content);
  if (!parsed) {
    console.warn('automation_json_parse_failed', tenantId, channel);
    const fallbackReply = aiResult.content || 'Sorry, could you rephrase that?';
    await saveMessage(env, ctx, { tenantId, sessionId, direction: 'outbound', content: fallbackReply, providerUsed: aiResult.providerUsed });
    return { reply: fallbackReply, providerUsed: aiResult.providerUsed };
  }

  if (parsed.intent === 'order_confirmation' && parsed.order?.items?.length > 0) {
    await orderService.captureOrder(env, ctx, {
      tenantId,
      sessionId,
      channel,
      customerIdentifier: externalUserId,
      customerName: displayName,
      items: parsed.order.items,
      totalAmount: parsed.order.totalAmount,
      currency: parsed.order.currency,
      rawMessage: text,
    });
    await query(env, ctx, `UPDATE sessions SET last_intent = 'order_confirmation' WHERE id = ?`, [sessionId]);
  }

  const reply = parsed.reply || 'Thanks for your message!';
  await saveMessage(env, ctx, { tenantId, sessionId, direction: 'outbound', content: reply, providerUsed: aiResult.providerUsed });
  return { reply, providerUsed: aiResult.providerUsed };
}
