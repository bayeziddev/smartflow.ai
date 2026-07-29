const AIRouter = require('./aiRouter/AIRouter');
const orderService = require('./orderService');
const { query } = require('../db/pool');
const logger = require('../utils/logger');

const EXTRACTION_SYSTEM_PROMPT = `You are an order-intake assistant for a small business chatbot.
Read the customer's message and reply with ONLY a JSON object (no prose, no markdown fences) matching exactly this shape:
{
  "intent": "order_confirmation" | "question" | "greeting" | "other",
  "reply": "<a short, friendly reply to send back to the customer>",
  "order": { "items": [{ "name": "string", "quantity": number }], "totalAmount": number, "currency": "string" } | null
}
Only populate "order" when intent is "order_confirmation" AND the message clearly confirms specific item(s) to buy.
If unsure, use intent "other" and leave "order" null — never guess at an order that was not clearly confirmed.`;

function safeParseJson(text) {
  if (!text) return null;
  try {
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function getOrCreateSession(tenantId, channel, externalUserId, displayName) {
  await query(
    `INSERT INTO sessions (tenant_id, channel, external_user_id, display_name, last_message_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_message_at = NOW(), display_name = COALESCE(VALUES(display_name), display_name)`,
    [tenantId, channel, externalUserId, displayName || null]
  );
  const rows = await query(`SELECT id FROM sessions WHERE tenant_id = ? AND channel = ? AND external_user_id = ?`, [
    tenantId,
    channel,
    externalUserId,
  ]);
  return rows[0].id;
}

/**
 * The single automation entry point every channel handler calls once
 * it has a plaintext inbound message. Detects intent, extracts a
 * structured order when confirmed, writes it to `orders` (idempotent
 * via orderService), and returns the reply text to send back.
 */
async function handleIncomingMessage({ tenantId, channel, externalUserId, displayName, text, preferredProvider }) {
  const sessionId = await getOrCreateSession(tenantId, channel, externalUserId, displayName);

  const aiResult = await AIRouter.chat({
    tenantId,
    provider: preferredProvider || 'openai',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  });

  const parsed = safeParseJson(aiResult.content);
  if (!parsed) {
    logger.warn('automation_json_parse_failed', { tenantId, channel });
    return { reply: aiResult.content || 'Sorry, could you rephrase that?', providerUsed: aiResult.providerUsed };
  }

  if (parsed.intent === 'order_confirmation' && parsed.order?.items?.length > 0) {
    await orderService.captureOrder({
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
    await query(`UPDATE sessions SET last_intent = 'order_confirmation' WHERE id = ?`, [sessionId]);
  }

  return { reply: parsed.reply || 'Thanks for your message!', providerUsed: aiResult.providerUsed };
}

module.exports = { handleIncomingMessage };
