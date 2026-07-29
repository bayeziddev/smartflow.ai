const { env, assertRequiredEnv } = require('./src/config/env');
const logger = require('./src/utils/logger');

assertRequiredEnv();

const app = require('./src/app');

const server = app.listen(env.PORT, () => {
  logger.info('server_started', { port: env.PORT, env: env.NODE_ENV });
});

process.on('SIGTERM', () => {
  logger.info('shutting_down');
  server.close(() => process.exit(0));
});
