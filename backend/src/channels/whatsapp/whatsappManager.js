const { fork } = require('child_process');
const path = require('path');
const { query } = require('../../db/pool');
const logger = require('../../utils/logger');
const notificationService = require('../../services/notificationService');
const automationService = require('../../services/automationService');

const WORKER_PATH = path.join(__dirname, 'whatsappWorker.js');

const workers = new Map(); // tenantId -> ChildProcess
const latestQr = new Map(); // tenantId -> latest QR payload

async function updateChannelStatus(tenantId, status) {
  await query(`UPDATE channel_configs SET status = ? WHERE tenant_id = ? AND channel = 'whatsapp'`, [status, tenantId]);
}

function startSessionForTenant(tenantId) {
  if (workers.has(tenantId)) {
    logger.info('whatsapp_session_already_running', { tenantId });
    return;
  }

  const child = fork(WORKER_PATH, [], {
    env: { ...process.env, WHATSAPP_TENANT_ID: String(tenantId) },
    // stdio isolation: worker crashes/logs never touch the parent's
    // stdout formatting; failures surface via the 'crash' IPC message
    // and the 'exit' event below, not by taking down this process.
  });

  workers.set(tenantId, child);
  logger.info('whatsapp_worker_started', { tenantId, pid: child.pid });

  child.on('message', (msg) => handleWorkerMessage(tenantId, msg));

  child.on('exit', (code, signal) => {
    logger.warn('whatsapp_worker_exited', { tenantId, code, signal });
    workers.delete(tenantId);
    latestQr.delete(tenantId);
    updateChannelStatus(tenantId, 'disconnected').catch(() => {});
  });

  child.on('error', (err) => {
    logger.error('whatsapp_worker_process_error', { tenantId, error: err.message });
  });
}

function stopSessionForTenant(tenantId) {
  const child = workers.get(tenantId);
  if (!child) return;
  child.kill('SIGTERM');
  workers.delete(tenantId);
  latestQr.delete(tenantId);
}

function getLatestQr(tenantId) {
  return latestQr.get(tenantId) || null;
}

/**
 * Registered with notificationService so a 401/429 from the AI Router
 * can reach the tenant's own WhatsApp number without notificationService
 * needing to know anything about child processes or baileys.
 */
async function sendSystemMessage(tenantId, to, text) {
  const child = workers.get(tenantId);
  if (!child) throw new Error(`No running WhatsApp session for tenant ${tenantId}`);
  child.send({ type: 'send', to, text });
}
notificationService.registerWhatsappSender(sendSystemMessage);

async function handleWorkerMessage(tenantId, msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'qr':
      latestQr.set(tenantId, msg.qr);
      await updateChannelStatus(tenantId, 'pending_qr');
      break;

    case 'status':
      await updateChannelStatus(tenantId, msg.status);
      if (msg.status === 'connected') latestQr.delete(tenantId);
      break;

    case 'crash':
      logger.error('whatsapp_worker_reported_crash', { tenantId, error: msg.error });
      await updateChannelStatus(tenantId, 'error');
      break;

    case 'inbound_message':
      try {
        const { reply } = await automationService.handleIncomingMessage({
          tenantId,
          channel: 'whatsapp',
          externalUserId: msg.from,
          displayName: msg.displayName,
          text: msg.text,
        });
        await sendSystemMessage(tenantId, msg.from, reply);
      } catch (err) {
        logger.error('whatsapp_inbound_handling_failed', { tenantId, error: err.message });
      }
      break;

    default:
      break;
  }
}

module.exports = { startSessionForTenant, stopSessionForTenant, getLatestQr, sendSystemMessage };
