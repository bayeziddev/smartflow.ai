const { Telegraf } = require('telegraf');
const { query } = require('../../db/pool');
const logger = require('../../utils/logger');
const automationService = require('../../services/automationService');

// One Telegraf bot instance per tenant bot token, created lazily and
// cached — webhook delivery means there's no long-lived connection to
// isolate the way WhatsApp needs a whole child process, so a Map is
// enough here rather than fork()ing anything.
const botsByToken = new Map();

function getBot(botToken) {
  if (!botsByToken.has(botToken)) {
    const bot = new Telegraf(botToken);
    botsByToken.set(botToken, bot);
  }
  return botsByToken.get(botToken);
}

/**
 * Registers a tenant's bot token and points its Telegram webhook at
 * our shared inbound route. Call this when a tenant enables the
 * Telegram channel from the dashboard.
 */
async function registerWebhookForTenant(tenantId, botToken, publicWebhookBaseUrl) {
  const bot = getBot(botToken);
  const webhookUrl = `${publicWebhookBaseUrl}/api/webhooks/telegram/${tenantId}`;
  await bot.telegram.setWebhook(webhookUrl);

  await query(
    `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status, external_identifier)
     VALUES (?, 'telegram', 1, 'connected', ?)
     ON DUPLICATE KEY UPDATE is_enabled = 1, status = 'connected', external_identifier = VALUES(external_identifier)`,
    [tenantId, webhookUrl]
  );

  return { webhookUrl };
}

/**
 * Called by the Express route in routes/webhook.routes.js for every
 * inbound Telegram update. `botToken` is looked up per-tenant so this
 * function never has to guess which bot the update belongs to.
 */
async function handleWebhookUpdate(tenantId, botToken, update) {
  const message = update.message;
  if (!message || !message.text) return; // ignore non-text updates for now

  const chatId = message.chat.id;
  const displayName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || null;

  const { reply } = await automationService.handleIncomingMessage({
    tenantId,
    channel: 'telegram',
    externalUserId: String(chatId),
    displayName,
    text: message.text,
  });

  const bot = getBot(botToken);
  await bot.telegram.sendMessage(chatId, reply);
}

module.exports = { registerWebhookForTenant, handleWebhookUpdate };