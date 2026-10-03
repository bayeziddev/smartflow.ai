import * as AIRouter from '../aiRouter/AIRouter.js';
import * as orderService from './orderService.js';
import * as botSettingsService from './botSettingsService.js';
import { query } from '../db/client.js';

/**
 * The one place every channel (WhatsApp Cloud API, WhatsApp by QR,
 * Messenger, the dashboard's Test-your-bot chat) turns an incoming customer
 * message into a reply. It always produces a reply, in this order:
 *
 *   1. A matching keyword auto-reply rule — instant, needs no AI key.
 *   2. The AI, through the tenant's own key (AIRouter handles failover between
 *      providers), primed with the business's instructions and the recent
 *      conversation. Confirmed orders are captured on the way.
 *   3. The fallback message — when the AI is off, no key is configured, or
 *      every provider failed — so a customer is never left without an answer.
 *
 * A first-time customer also gets the welcome message, if one is set.
 * When the bot is paused it records the message and stays silent (reply null).
 */

const HISTORY_TURNS = 10;

const EXTRACTION_SYSTEM_PROMPT = `You are a helpful customer-service assistant replying to customers of a small business on chat apps.
Read the customer's latest message (and the conversation so far) and reply with ONLY a JSON object (no prose, no markdown fences) matching exactly this shape:
{
  "intent": "order_confirmation" | "question" | "greeting" | "other",
  "reply": "<a short, friendly reply to send back to the customer, in the customer's language>",
  "order": { "items": [{ "name": "string", "quantity": number }], "totalAmount": number, "currency": "string" } | null
}
Only populate "order" when intent is "order_confirmation" AND the message clearly confirms specific item(s) to buy.
If unsure, use intent "other" and leave "order" null. Never invent prices, stock or policies you were not told.`;

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(String(text).replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

export function buildSystemPrompt(settings) {
  const parts = [EXTRACTION_SYSTEM_PROMPT];
  if (settings.businessName) parts.push(`You are replying on behalf of: ${settings.businessName}.`);
  if (settings.aiInstructions) parts.push(`Business information and instructions from the owner:\n${settings.aiInstructions}`);
  return parts.join('\n\n');
}

async function getOrCreateSession(env, ctx, tenantId, channel, externalUserId, displayName) {
  const existing = await query(env, ctx, `SELECT id FROM sessions WHERE tenant_id = ? AND channel = ? AND external_user_id = ?`, [
    tenantId,
    channel,
    externalUserId,
  ]);
  await query(
    env,
    ctx,
    `INSERT INTO sessions (tenant_id, channel, external_user_id, display_name, last_message_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_message_at = NOW(), display_name = COALESCE(VALUES(display_name), display_name)`,
    [tenantId, channel, externalUserId, displayName || null]
  );
  if (existing[0]) return { sessionId: existing[0].id, isNew: false };
  const rows = await query(env, ctx, `SELECT id FROM sessions WHERE tenant_id = ? AND channel = ? AND external_user_id = ?`, [
    tenantId,
    channel,
    externalUserId,
  ]);
  return { sessionId: rows[0].id, isNew: true };
}

async function saveMessage(env, ctx, { tenantId, sessionId, direction, content, providerUsed }) {
  await query(env, ctx, `INSERT INTO messages (tenant_id, session_id, direction, content, provider_used) VALUES (?, ?, ?, ?, ?)`, [
    tenantId,
    sessionId,
    direction,
    content,
    providerUsed || null,
  ]);
}

async function recentHistory(env, ctx, sessionId) {
  const rows = await query(
    env,
    ctx,
    `SELECT direction, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ${HISTORY_TURNS + 1}`,
    [sessionId]
  );
  // Newest first from the DB; drop the message we just saved (it's sent separately) and restore order.
  return rows
    .slice(1)
    .reverse()
    .map((r) => ({ role: r.direction === 'inbound' ? 'user' : 'assistant', content: r.content }));
}

/**
 * @returns {Promise<{reply: string|null, source: 'rule'|'ai'|'fallback'|'paused', providerUsed?: string, ruleId?: number, orderCaptured?: boolean, welcome?: string|null}>}
 */
export async function handleIncomingMessage(env, ctx, { tenantId, channel, externalUserId, displayName, text, preferredProvider }) {
  const { sessionId, isNew } = await getOrCreateSession(env, ctx, tenantId, channel, externalUserId, displayName);
  await saveMessage(env, ctx, { tenantId, sessionId, direction: 'inbound', content: text });

  const settings = await botSettingsService.getSettings(env, ctx, tenantId);
  if (settings.isPaused) return { reply: null, source: 'paused' };

  const welcome = isNew && settings.welcomeMessage ? settings.welcomeMessage : null;
  const finish = async (reply, extra) => {
    const full = welcome && reply !== welcome ? `${welcome}\n\n${reply}` : reply;
    await saveMessage(env, ctx, { tenantId, sessionId, direction: 'outbound', content: full, providerUsed: extra.providerUsed });
    return { reply: full, welcome, ...extra };
  };

  // 1. Keyword rules.
  const rules = await botSettingsService.listRules(env, ctx, tenantId);
  const rule = botSettingsService.matchRule(rules, text);
  if (rule) {
    await botSettingsService.recordRuleHit(env, ctx, rule.id);
    return finish(rule.reply, { source: 'rule', ruleId: rule.id });
  }

  // 2. AI with the tenant's own key.
  if (settings.aiEnabled) {
    try {
      const history = await recentHistory(env, ctx, sessionId);
      const aiResult = await AIRouter.chat(env, ctx, {
        tenantId,
        provider: preferredProvider || settings.preferredProvider || 'openai',
        messages: [{ role: 'system', content: buildSystemPrompt(settings) }, ...history, { role: 'user', content: text }],
      });

      const parsed = safeParseJson(aiResult.content);
      if (!parsed) {
        console.warn('automation_json_parse_failed', tenantId, channel);
        const plain = String(aiResult.content || '').trim();
        if (plain) return finish(plain, { source: 'ai', providerUsed: aiResult.providerUsed });
      } else {
        let orderCaptured = false;
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
          orderCaptured = true;
        }
        if (parsed.reply) return finish(String(parsed.reply), { source: 'ai', providerUsed: aiResult.providerUsed, orderCaptured });
      }
    } catch (err) {
      // No key configured, or every provider failed: fall through to the fallback reply.
      console.warn('automation_ai_unavailable', tenantId, channel, err.code || '', err.message);
    }
  }

  // 3. Fallback.
  return finish(settings.fallbackMessage || botSettingsService.DEFAULT_SETTINGS.fallbackMessage, { source: 'fallback' });
}
