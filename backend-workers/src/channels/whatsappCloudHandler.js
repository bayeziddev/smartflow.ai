import * as automationService from '../services/automationService.js';
import * as channelCredentialService from '../services/channelCredentialService.js';

const GRAPH_API_VERSION = 'v23.0';

export function verifyWebhookSync(query, foundTenantId) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode !== 'subscribe' || !token || !foundTenantId) return null;
  return challenge;
}

export async function handleWebhookEvent(env, ctx, body) {
  const entries = body.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId || !Array.isArray(value.messages)) continue;

      const tenantId = await channelCredentialService.findTenantByExternalIdentifier(env, ctx, 'whatsapp', phoneNumberId);
      if (!tenantId) {
        console.warn('whatsapp_cloud_unknown_phone_number_id', phoneNumberId);
        continue;
      }

      const contact = value.contacts?.[0];
      for (const message of value.messages) {
        if (message.type !== 'text') continue;
        await processInboundMessage(env, ctx, tenantId, message.from, contact?.profile?.name, message.text.body);
      }
    }
  }
}

async function processInboundMessage(env, ctx, tenantId, from, displayName, text) {
  try {
    const { reply } = await automationService.handleIncomingMessage(env, ctx, {
      tenantId,
      channel: 'whatsapp',
      externalUserId: from,
      displayName,
      text,
    });
    await sendMessage(env, ctx, tenantId, from, reply);
  } catch (err) {
    console.error('whatsapp_cloud_inbound_failed', tenantId, err.message);
  }
}

export async function sendMessage(env, ctx, tenantId, to, text) {
  const creds = await channelCredentialService.resolveChannelCredentials(env, ctx, tenantId, 'whatsapp');
  if (!creds) throw new Error(`No WhatsApp Cloud API credentials configured for tenant ${tenantId}`);

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${creds.externalIdentifier}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('whatsapp_cloud_send_failed', tenantId, res.status, errData.error?.message);
    const err = new Error(`WhatsApp send failed: ${errData.error?.message || res.statusText}`);
    err.status = res.status;
    throw err;
  }
}
