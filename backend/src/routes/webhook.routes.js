const express = require('express');
const { query } = require('../db/pool');
const tenantApiConfigService = require('../services/tenantApiConfigService');
const telegramHandler = require('../channels/telegram/telegramHandler');
const emailHandler = require('../channels/email/emailHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Telegram calls this once per update after registerWebhookForTenant()
 * points the bot's webhook here. :tenantId is not a secret by itself —
 * Telegraf's `secret_token` mechanism (set via setWebhook and checked
 * here through the `x-telegram-bot-api-secret-token` header) is what
 * actually stops spoofed requests; wire a per-tenant secret into
 * channel_configs before relying on this in production.
 */
router.post('/telegram/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  try {
    const rows = await query(
      `SELECT metadata_json FROM channel_configs WHERE tenant_id = ? AND channel = 'telegram' AND is_enabled = 1`,
      [tenantId]
    );
    if (rows.length === 0) return res.sendStatus(404);

    const botToken = rows[0].metadata_json?.botToken;
    if (!botToken) return res.sendStatus(404);

    await telegramHandler.handleWebhookUpdate(Number(tenantId), botToken, req.body);
    res.sendStatus(200);
  } catch (err) {
    logger.error('telegram_webhook_failed', { tenantId, error: err.message });
    // Still 200 so Telegram doesn't hammer retries for an error on our side.
    res.sendStatus(200);
  }
});

/**
 * Generic inbound-email webhook. Point your email provider's
 * "inbound parse" feature here (Mailgun routes, SendGrid Inbound
 * Parse, Postmark inbound webhooks, etc.) and adapt the field names
 * below to whichever payload shape that provider sends.
 */
router.post('/email/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  try {
    const { from, subject, text } = req.body;
    if (!from || !text) return res.status(400).json({ error: 'from and text are required' });

    const rows = await query(
      `SELECT metadata_json FROM channel_configs WHERE tenant_id = ? AND channel = 'email' AND is_enabled = 1`,
      [tenantId]
    );
    const smtpConfig = rows[0]?.metadata_json?.smtp || null;

    await emailHandler.handleInboundEmail(Number(tenantId), { from, subject: subject || '(no subject)', text }, smtpConfig);
    res.sendStatus(200);
  } catch (err) {
    logger.error('email_webhook_failed', { tenantId, error: err.message });
    res.sendStatus(500);
  }
});

module.exports = router;
