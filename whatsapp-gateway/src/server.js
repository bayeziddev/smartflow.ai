import * as baileys from 'baileys';
import pino from 'pino';
import { createApp } from './app.js';
import { SessionManager } from './sessionManager.js';
import { createBackendClient } from './backend.js';

/**
 * SmartFlow WhatsApp QR gateway — see README.md.
 *
 * Environment:
 *   GATEWAY_SECRET  shared secret, the same value as the backend's WA_GATEWAY_SECRET (required)
 *   BACKEND_URL     the SmartFlow backend, e.g. https://fanchatbot-backend.<you>.workers.dev (required)
 *   DATA_DIR        where WhatsApp logins are stored — a persistent disk (default ./data)
 *   PORT            HTTP port (default 8790)
 *   LOG_LEVEL       info | warn | error | debug (default info)
 */
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const secret = process.env.GATEWAY_SECRET;
const backendUrl = process.env.BACKEND_URL;
if (!secret || secret.length < 16) {
  logger.fatal('GATEWAY_SECRET is missing or shorter than 16 characters');
  process.exit(1);
}
if (!backendUrl) {
  logger.fatal('BACKEND_URL is missing');
  process.exit(1);
}

const manager = new SessionManager({
  baileys: { ...baileys, makeWASocket: baileys.makeWASocket || baileys.default },
  backend: createBackendClient({ baseUrl: backendUrl, secret, logger }),
  dataDir: process.env.DATA_DIR || './data',
  logger,
  waLogger: logger.child({ module: 'baileys' }, { level: process.env.BAILEYS_LOG_LEVEL || 'warn' }),
});

const port = Number(process.env.PORT || 8790);
const server = createApp({ manager, secret, logger });
server.listen(port, () => logger.info({ port }, 'whatsapp gateway listening'));

manager
  .restoreAll()
  .then((ids) => ids.length && logger.info({ tenants: ids }, 'restored linked WhatsApp sessions'))
  .catch((err) => logger.error({ err: err.message }, 'restore failed'));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await manager.shutdown();
    process.exit(0);
  });
}
