const { query } = require('../db/pool');
const whatsappManager = require('../channels/whatsapp/whatsappManager');
const channelCredentialService = require('../services/channelCredentialService');
const AppError = require('../utils/AppError');

const VALID_CHANNELS = ['whatsapp', 'telegram', 'messenger', 'email'];

// GET /api/channels
async function listChannels(req, res, next) {
  try {
    const rows = await query(
      `SELECT channel, is_enabled, status, external_identifier FROM channel_configs WHERE tenant_id = ?`,
      [req.tenantId]
    );
    const byChannel = Object.fromEntries(rows.map((r) => [r.channel, r]));
    const channels = VALID_CHANNELS.map((channel) => ({
      channel,
      isEnabled: !!byChannel[channel]?.is_enabled,
      status: byChannel[channel]?.status || 'disconnected',
      externalIdentifier: byChannel[channel]?.external_identifier || null,
    }));
    res.json({ channels });
  } catch (err) {
    next(err);
  }
}

// POST /api/channels/:channel/toggle  { enabled }
async function toggleChannel(req, res, next) {
  try {
    const { channel } = req.params;
    const { enabled } = req.body;
    if (!VALID_CHANNELS.includes(channel)) {
      throw new AppError(`Unknown channel "${channel}"`, 400, 'INVALID_CHANNEL');
    }

    await query(
      `INSERT INTO channel_configs (tenant_id, channel, is_enabled, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled),
         status = IF(VALUES(is_enabled) = 0, 'disconnected', status)`,
      [req.tenantId, channel, enabled ? 1 : 0, enabled ? 'pending_qr' : 'disconnected']
    );

    // WhatsApp needs an isolated worker process spun up/down per
    // tenant — the other channels are webhook/SMTP based and don't
    // need a background process to "connect".
    if (channel === 'whatsapp') {
      if (enabled) {
        await whatsappManager.startSessionForTenant(req.tenantId);
      } else {
        await whatsappManager.stopSessionForTenant(req.tenantId);
      }
    }

    res.json({ channel, enabled: !!enabled });
  } catch (err) {
    next(err);
  }
}

// GET /api/channels/whatsapp/qr — poll this while status is 'pending_qr'
async function getWhatsappQr(req, res, next) {
  try {
    const qr = whatsappManager.getLatestQr(req.tenantId);
    res.json({ qr: qr || null });
  } catch (err) {
    next(err);
  }
}

// POST /api/channels/whatsapp/credentials  { accessToken, phoneNumberId, webhookVerifyToken }
// POST /api/channels/messenger/credentials { accessToken, pageId, webhookVerifyToken }
// Same encrypt-then-mask pattern as the AI provider keys — the raw
// token is never echoed back in the response.
async function saveOfficialCredentials(req, res, next) {
  try {
    const { channel } = req.params;
    if (!['whatsapp', 'messenger'].includes(channel)) {
      throw new AppError('Only whatsapp and messenger use this endpoint', 400, 'INVALID_CHANNEL');
    }
    const { accessToken, webhookVerifyToken, phoneNumberId, pageId } = req.body;
    const externalIdentifier = channel === 'whatsapp' ? phoneNumberId : pageId;

    const result = await channelCredentialService.saveChannelCredentials(req.tenantId, channel, {
      accessToken,
      externalIdentifier,
      metadata: { webhookVerifyToken },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listChannels, toggleChannel, getWhatsappQr, saveOfficialCredentials };
