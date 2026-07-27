import * as automationService from '../services/automationService.js';
import * as channelCredentialService from '../services/channelCredentialService.js';

const GRAPH_API_VERSION = 'v23.0';

export async function handleWebhookEvent(env, ctx, body) {
  const entries = body.entry || [];
  for (const entry of entries) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue;
      const pageId = event.recipient?.id;
      const senderId = event.sender?.id;
      if (!pageId || !senderId) continue;

      const tenantId = await channelCredentialService.findTenantByExternalIdentifier(env, ctx, 'messenger', pageId);
      if (!tenantId) {
        console.warn('messenger_unknown_page_id', pageId);
        continue;
      }
      await processInboundMessage(env, ctx, tenantId, senderId, event.message.text);
    }
  }
}

async function processInboundMessage(env, ctx, tenantId, senderId, text) {
  try {
    const { reply } = await automationService.handleIncomingMessage(env, ctx, {
      tenantId,
      channel: 'messenger',
      externalUserId: senderId,
      displayName: null,
      text,
    });
    await sendMessage(env, ctx, tenantId, senderId, reply);
  } catch (err) {
    console.error('messenger_inbound_failed', tenantId, err.message);
  }
}

export async function sendMessage(env, ctx, tenantId, recipientId, text) {
  const creds = await channelCredentialService.resolveChannelCredentials(env, ctx, tenantId, 'messenger');
  if (!creds) throw new Error(`No Messenger credentials configured for tenant ${tenantId}`);

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${encodeURIComponent(creds.accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text }, messaging_type: 'RESPONSE' }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('messenger_send_failed', tenantId, res.status, errData.error?.message);
    const err = new Error(`Messenger send failed: ${errData.error?.message || res.statusText}`);
    err.status = res.status;
    throw err;
  }
}
