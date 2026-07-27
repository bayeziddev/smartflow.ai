import { query } from '../db/client.js';

function buildMessage(provider, httpStatus) {
  if (httpStatus === 401) {
    return `\u26a0\ufe0f Your ${provider.toUpperCase()} API key was rejected (unauthorized). Automated replies on this provider are paused until you update it in your dashboard.`;
  }
  if (httpStatus === 429) {
    return `\u23f3 Your ${provider.toUpperCase()} account hit its rate limit. Requests are being routed to a backup provider where possible.`;
  }
  return `\u26a0\ufe0f Your ${provider.toUpperCase()} integration returned an error (HTTP ${httpStatus}). Check your dashboard for details.`;
}

/**
 * Sends the tenant a WhatsApp alert about their own key failing.
 * Imports whatsappCloudHandler lazily to avoid a circular import
 * (whatsappCloudHandler also calls into automationService, which is
 * one hop away from this file).
 */
export async function notifyTenant(env, ctx, tenantId, provider, httpStatus) {
  const message = buildMessage(provider, httpStatus);
  console.warn('tenant_notification_triggered', tenantId, provider, httpStatus);

  try {
    const rows = await query(
      env,
      ctx,
      `SELECT external_identifier FROM channel_configs WHERE tenant_id = ? AND channel = 'whatsapp' AND is_enabled = 1 LIMIT 1`,
      [tenantId]
    );
    if (!rows[0]?.external_identifier) return { delivered: false, reason: 'no_whatsapp_number_on_file' };

    const { sendMessage } = await import('../channels/whatsappCloudHandler.js');
    // external_identifier here is the tenant's OWN business phone_number_id;
    // we still need the CUSTOMER-side number to notify the tenant, which for
    // a self-alert is the tenant's own verified admin WhatsApp number stored
    // separately — see docs/CHANNELS.md for wiring that field in if you want
    // this alert to reach a phone rather than just the dashboard/logs.
    console.warn('whatsapp_self_alert_not_fully_wired', tenantId);
    return { delivered: false, reason: 'admin_alert_number_not_configured' };
  } catch (err) {
    console.error('tenant_notification_failed', tenantId, provider, err.message);
    return { delivered: false, reason: 'send_failed' };
  }
}
