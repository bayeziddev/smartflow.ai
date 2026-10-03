import { query } from '../db/client.js';
import { HttpError } from '../httpError.js';
import { SUPPORTED_PROVIDERS } from '../aiRouter/providerFactory.js';

/**
 * Per-tenant bot behaviour (the dashboard's Automation page): who the bot
 * speaks for, extra instructions for the AI, the reply to send when nothing
 * else can answer, and keyword auto-replies that work without any AI key.
 */

export const DEFAULT_SETTINGS = {
  businessName: '',
  aiInstructions: '',
  welcomeMessage: '',
  fallbackMessage: "Thanks for your message! We've received it and will get back to you shortly.",
  aiEnabled: true,
  preferredProvider: 'openai',
  isPaused: false,
};

const LIMITS = { businessName: 150, aiInstructions: 4000, welcomeMessage: 1000, fallbackMessage: 1000 };

function fromRow(row) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    businessName: row.business_name || '',
    aiInstructions: row.ai_instructions || '',
    welcomeMessage: row.welcome_message || '',
    fallbackMessage: row.fallback_message || DEFAULT_SETTINGS.fallbackMessage,
    aiEnabled: !!row.ai_enabled,
    preferredProvider: SUPPORTED_PROVIDERS.includes(row.preferred_provider) ? row.preferred_provider : 'openai',
    isPaused: !!row.is_paused,
  };
}

export async function getSettings(env, ctx, tenantId) {
  const rows = await query(env, ctx, 'SELECT * FROM bot_settings WHERE tenant_id = ?', [tenantId]);
  return fromRow(rows[0]);
}

export async function saveSettings(env, ctx, tenantId, input = {}) {
  const current = await getSettings(env, ctx, tenantId);
  const next = { ...current };
  for (const key of Object.keys(LIMITS)) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string') throw new HttpError(`${key} must be text`, 400, 'INVALID_INPUT');
    if (input[key].length > LIMITS[key]) throw new HttpError(`${key} is longer than ${LIMITS[key]} characters`, 400, 'INVALID_INPUT');
    next[key] = input[key].trim();
  }
  if (input.aiEnabled !== undefined) next.aiEnabled = !!input.aiEnabled;
  if (input.isPaused !== undefined) next.isPaused = !!input.isPaused;
  if (input.preferredProvider !== undefined) {
    if (!SUPPORTED_PROVIDERS.includes(input.preferredProvider)) {
      throw new HttpError(`Unsupported provider "${input.preferredProvider}"`, 400, 'INVALID_PROVIDER');
    }
    next.preferredProvider = input.preferredProvider;
  }
  if (!next.fallbackMessage) next.fallbackMessage = DEFAULT_SETTINGS.fallbackMessage;

  await query(
    env,
    ctx,
    `INSERT INTO bot_settings (tenant_id, business_name, ai_instructions, welcome_message, fallback_message, ai_enabled, preferred_provider, is_paused)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE business_name = VALUES(business_name), ai_instructions = VALUES(ai_instructions),
       welcome_message = VALUES(welcome_message), fallback_message = VALUES(fallback_message), ai_enabled = VALUES(ai_enabled),
       preferred_provider = VALUES(preferred_provider), is_paused = VALUES(is_paused)`,
    [
      tenantId,
      next.businessName || null,
      next.aiInstructions || null,
      next.welcomeMessage || null,
      next.fallbackMessage,
      next.aiEnabled ? 1 : 0,
      next.preferredProvider,
      next.isPaused ? 1 : 0,
    ]
  );
  return next;
}

// ---------------------------------------------------------------- keyword rules

function ruleFromRow(r) {
  return {
    id: Number(r.id),
    keywords: r.keywords,
    matchType: r.match_type,
    reply: r.reply,
    isActive: !!r.is_active,
    sortOrder: r.sort_order,
    hitCount: Number(r.hit_count || 0),
  };
}

function validateRule(input) {
  const keywords = String(input.keywords ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (!keywords.length) throw new HttpError('Add at least one keyword (separate several with commas)', 400, 'INVALID_INPUT');
  const reply = String(input.reply ?? '').trim();
  if (!reply) throw new HttpError('The reply text is required', 400, 'INVALID_INPUT');
  if (reply.length > 2000) throw new HttpError('The reply is longer than 2000 characters', 400, 'INVALID_INPUT');
  const matchType = input.matchType === 'exact' ? 'exact' : 'contains';
  const joined = keywords.join(', ');
  if (joined.length > 500) throw new HttpError('Too many keywords for one rule', 400, 'INVALID_INPUT');
  return { keywords: joined, reply, matchType, isActive: input.isActive === undefined ? true : !!input.isActive, sortOrder: Number(input.sortOrder) || 0 };
}

export async function listRules(env, ctx, tenantId) {
  const rows = await query(env, ctx, 'SELECT * FROM auto_reply_rules WHERE tenant_id = ? ORDER BY sort_order, id', [tenantId]);
  return rows.map(ruleFromRow);
}

export async function createRule(env, ctx, tenantId, input) {
  const r = validateRule(input);
  const result = await query(
    env,
    ctx,
    'INSERT INTO auto_reply_rules (tenant_id, keywords, match_type, reply, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [tenantId, r.keywords, r.matchType, r.reply, r.isActive ? 1 : 0, r.sortOrder]
  );
  return { id: Number(result.insertId), ...r, hitCount: 0 };
}

export async function updateRule(env, ctx, tenantId, id, input) {
  const r = validateRule(input);
  const result = await query(
    env,
    ctx,
    'UPDATE auto_reply_rules SET keywords = ?, match_type = ?, reply = ?, is_active = ?, sort_order = ? WHERE id = ? AND tenant_id = ?',
    [r.keywords, r.matchType, r.reply, r.isActive ? 1 : 0, r.sortOrder, id, tenantId]
  );
  if (!result.affectedRows) throw new HttpError('Rule not found', 404, 'NOT_FOUND');
  return { id: Number(id), ...r };
}

export async function deleteRule(env, ctx, tenantId, id) {
  const result = await query(env, ctx, 'DELETE FROM auto_reply_rules WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (!result.affectedRows) throw new HttpError('Rule not found', 404, 'NOT_FOUND');
  return { id: Number(id), deleted: true };
}

/** Lower-case, collapse whitespace, drop punctuation — so "Price?" matches the keyword "price". */
export function normaliseText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The first active rule (in sort order) whose keywords match the message, or null. */
export function matchRule(rules, text) {
  const msg = normaliseText(text);
  if (!msg) return null;
  const padded = ` ${msg} `;
  for (const rule of rules) {
    if (!rule.isActive) continue;
    const keywords = rule.keywords.split(',').map(normaliseText).filter(Boolean);
    const hit = keywords.some((k) => (rule.matchType === 'exact' ? msg === k : padded.includes(` ${k} `) || (/[^\x00-\x7F]/.test(k) && msg.includes(k))));
    if (hit) return rule;
  }
  return null;
}

export async function recordRuleHit(env, ctx, ruleId) {
  try {
    await query(env, ctx, 'UPDATE auto_reply_rules SET hit_count = hit_count + 1 WHERE id = ?', [ruleId]);
  } catch (err) {
    console.error('rule_hit_count_failed', ruleId, err.message);
  }
}
