const logger = require('../utils/logger');
const { query } = require('../db/pool');

/**
 * Fires when the AI Router hits a 401 (bad/revoked key) or 429 (rate
 * limited) on a tenant's provider key. Decoupled from the WhatsApp
 * channel module on purpose — this service doesn't know HOW the
 * message gets delivered, just THAT one should be sent. Wire it to
 * `channels/whatsapp/whatsappManager.sendSystemMessage` once that
 * module exists in your deployment.
 */
let whatsappSender = null;

/**
 * Called once at startup by the WhatsApp channel manager to register
 * itself as the delivery mechanism for these alerts, keeping this
 * module free of a hard dependency on `baileys`/`whatsapp-web.js`.
 */
function registerWhatsappSender(sendFn) {
  whatsappSender = sendFn;
}

function buildMessage(provider, httpStatus) {
  if (httpStatus === 401) {
    return `⚠️ Your ${provider.toUpperCase()} API key was rejected (unauthorized). Automated replies on this provider are paused until you update it in your dashboard → Settings → API Keys.`;
  }
  if (httpStatus === 429) {
    return `⏳ Your ${provider.toUpperCase()} account hit its rate limit. Requests are being routed to a backup provider where possible. Consider upgrading your ${provider} plan if this keeps happening.`;
  }
  return `⚠️ Your ${provider.toUpperCase()} integration returned an error (HTTP ${httpStatus}). Check your dashboard for details.`;
}

async function notifyTenant(tenantId, provider, httpStatus) {
  const message = buildMessage(provider, httpStatus);
  logger.warn('tenant_notification_triggered', { tenantId, provider, httpStatus });

  if (!whatsappSender) {
    logger.warn('whatsapp_sender_not_registered', { tenantId, provider, httpStatus });
    return { delivered: false, reason: 'whatsapp_channel_not_wired' };
  }

  try {
    // The tenant's own WhatsApp-connected number is looked up, not
    // hardcoded — see channel_configs.external_identifier.
    const [config] = await query(
      `SELECT external_identifier FROM channel_configs WHERE tenant_id = ? AND channel = 'whatsapp' AND is_enabled = 1 LIMIT 1`,
      [tenantId]
    );
    if (!config?.external_identifier) {
      return { delivered: false, reason: 'no_whatsapp_number_on_file' };
    }
    await whatsappSender(tenantId, config.external_identifier, message);
    return { delivered: true };
  } catch (err) {
    logger.error('tenant_notification_failed', { tenantId, provider, error: err.message });
    return { delivered: false, reason: 'send_failed' };
  }
}

module.exports = { notifyTenant, registerWhatsappSender };
