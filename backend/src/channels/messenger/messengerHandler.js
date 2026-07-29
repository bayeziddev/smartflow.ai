const axios = require('axios');
const logger = require('../../utils/logger');
const automationService = require('../../services/automationService');
const channelCredentialService = require('../../services/channelCredentialService');

const GRAPH_API_VERSION = 'v23.0';

/**
 * Official Meta Messenger Platform. Same webhook infrastructure family
 * as WhatsApp Cloud API (shared hub.challenge verification pattern),
 * but the Send API and payload shape differ. Messenger itself has no
 * per-message fee from Meta — this is the free channel of the four.
 *
 * One webhook URL shared across every tenant; routing happens by
 * Facebook Page ID, which every payload includes.
 */

async function verifyWebhook(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe' || !token) return null;

  const tenantId = await channelCredentialService.findTenantByVerifyToken('messenger', token);
  if (!tenantId) return null;

  return challenge;
}

/**
 * Payload shape: entry[].messaging[].{ sender: {id}, recipient: {id},
 * message: { text } } — recipient.id is the Page ID.
 */
async function handleWebhookEvent(body) {
  const entries = body.entry || [];

  for (const entry of entries) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue; // attachments/postbacks: extend here later
      const pageId = event.recipient?.id;
      const senderId = event.sender?.id;
      if (!pageId || !senderId) continue;

      const tenantId = await channelCredentialService.findTenantByExternalIdentifier('messenger', pageId);
      if (!tenantId) {
        logger.warn('messenger_unknown_page_id', { pageId });
        continue;
      }

      await processInboundMessage(tenantId, senderId, event.message.text);
    }
  }
}

async function processInboundMessage(tenantId, senderId, text) {
  try {
    const { reply } = await automationService.handleIncomingMessage({
      tenantId,
      channel: 'messenger',
      externalUserId: senderId,
      displayName: null,
      text,
    });
    await sendMessage(tenantId, senderId, reply);
  } catch (err) {
    logger.error('messenger_inbound_failed', { tenantId, error: err.message });
  }
}

async function sendMessage(tenantId, recipientId, text) {
  const creds = await channelCredentialService.resolveChannelCredentials(tenantId, 'messenger');
  if (!creds) throw new Error(`No Messenger credentials configured for tenant ${tenantId}`);

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;
  try {
    await axios.post(
      url,
      { recipient: { id: recipientId }, message: { text }, messaging_type: 'RESPONSE' },
      { params: { access_token: creds.accessToken }, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const metaError = err.response?.data?.error;
    logger.error('messenger_send_failed', { tenantId, status: err.response?.status, message: metaError?.message });
    throw err;
  }
}

module.exports = { verifyWebhook, handleWebhookEvent, sendMessage };
