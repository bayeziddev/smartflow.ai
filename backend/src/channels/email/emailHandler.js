const nodemailer = require('nodemailer');
const { query } = require('../../db/pool');
const logger = require('../../utils/logger');
const automationService = require('../../services/automationService');

let transporter = null;

/**
 * Tenants provide their own SMTP credentials (same "helper, not the
 * source of truth" pattern as the AI provider keys) via the dashboard;
 * this lazily builds one nodemailer transporter per tenant and reuses
 * it across sends.
 */
const transportersByTenant = new Map();

function getTransporter(tenantId, smtpConfig) {
  if (!transportersByTenant.has(tenantId)) {
    transportersByTenant.set(
      tenantId,
      nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      })
    );
  }
  return transportersByTenant.get(tenantId);
}

async function sendReplyEmail(tenantId, smtpConfig, to, subject, text) {
  const transport = getTransporter(tenantId, smtpConfig);
  await transport.sendMail({
    from: smtpConfig.fromAddress || smtpConfig.user,
    to,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text,
  });
}

/**
 * Inbound email is provider-dependent (Mailgun/SendGrid/Postmark
 * "inbound parse" webhooks all normalize to roughly: from, subject,
 * text/body). This function assumes that normalized shape — adapt the
 * webhook route for whichever inbound-parse provider you wire up.
 */
async function handleInboundEmail(tenantId, { from, subject, text }, smtpConfig) {
  const { reply } = await automationService.handleIncomingMessage({
    tenantId,
    channel: 'email',
    externalUserId: from,
    displayName: null,
    text: `Subject: ${subject}\n\n${text}`,
  });

  if (smtpConfig) {
    await sendReplyEmail(tenantId, smtpConfig, from, subject, reply);
  } else {
    logger.warn('email_reply_skipped_no_smtp_config', { tenantId });
  }

  return reply;
}

module.exports = { sendReplyEmail, handleInboundEmail };
