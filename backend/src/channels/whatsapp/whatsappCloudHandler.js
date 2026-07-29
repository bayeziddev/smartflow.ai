const axios = require('axios');
const logger = require('../../utils/logger');
const automationService = require('../../services/automationService');
const channelCredentialService = require('../../services/channelCredentialService');

// Check developers.facebook.com/docs/graph-api/changelog before bumping —
// Meta deprecates old versions on a schedule, this isn't a "set once" constant.
const GRAPH_API_VERSION = 'v23.0';

/**
 * Official Meta WhatsApp Cloud API — this is the ToS-compliant
 * replacement for the baileys-based channel. No QR code, no session
 * file, no child-process isolation needed: Meta hosts the connection,
 * you just get webhooks. Service-conversation replies (customer
 * messages you, you reply within 24h) are free; see docs/CHANNELS.md
 * for the cost breakdown before sending outbound marketing messages.
 *
 * One webhook URL is shared across every tenant — Meta doesn't support
 * per-tenant URLs — so routing happens by looking up which tenant owns
 * the `phone_number_id` included in every payload.
 */

/**
 * Handles Meta's GET verification handshake. Meta calls this once when
 * you save the webhook URL in the dashboard, with hub.mode,
 * hub.verify_token and hub.challenge query params — you must echo
 * hub.challenge back if the token matches, or Meta refuses to save it.
 */
async function verifyWebhook(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe' || !token) return null;

  const tenantId = await channelCredentialService.findTenantByVerifyToken('whatsapp', token);
  if (!tenantId) return null;

  return challenge;
}

/**
 * Handles Meta's POST event notifications. Payload shape:
 * entry[].changes[].value.{ metadata: { phone_number_id }, messages: [...] }
 */
async function handleWebhookEvent(body) {
  const entries = body.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId || !Array.isArray(value.messages)) continue; // status-only updates, skip

      const tenantId = await channelCredentialService.findTenantByExternalIdentifier('whatsapp', phoneNumberId);
      if (!tenantId) {
        logger.warn('whatsapp_cloud_unknown_phone_number_id', { phoneNumberId });
        continue;
      }

      const contact = value.contacts?.[0];
      for (const message of value.messages) {
        if (message.type !== 'text') continue; // images/audio/etc: extend here later
        await processInboundMessage(tenantId, phoneNumberId, message.from, contact?.profile?.name, message.text.body);
      }
    }
  }
}

async function processInboundMessage(tenantId, phoneNumberId, from, displayName, text) {
  try {
    const { reply } = await automationService.handleIncomingMessage({
      tenantId,
      channel: 'whatsapp',
      externalUserId: from,
      displayName,
      text,
    });
    await sendMessage(tenantId, from, reply);
  } catch (err) {
    logger.error('whatsapp_cloud_inbound_failed', { tenantId, error: err.message });
  }
}

/**
 * Sends a text message via the Cloud API using the tenant's own
 * stored access token — decrypted in memory for this call only.
 */
async function sendMessage(tenantId, to, text) {
  const creds = await channelCredentialService.resolveChannelCredentials(tenantId, 'whatsapp');
  if (!creds) throw new Error(`No WhatsApp Cloud API credentials configured for tenant ${tenantId}`);

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${creds.externalIdentifier}/messages`;
  try {
    await axios.post(
      url,
      { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } },
      { headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const metaError = err.response?.data?.error;
    logger.error('whatsapp_cloud_send_failed', { tenantId, status: err.response?.status, message: metaError?.message });
    throw err;
  }
}

module.exports = { verifyWebhook, handleWebhookEvent, sendMessage };
