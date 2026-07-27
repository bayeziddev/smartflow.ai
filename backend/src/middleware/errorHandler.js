const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error('unhandled_error', { path: req.path, method: req.method, message: err.message, stack: err.stack });
  } else {
    logger.warn('request_error', { path: req.path, method: req.method, statusCode, code, message: err.message });
  }

  res.status(statusCode).json({
    error: {
      code,
      message: err.isOperational ? err.message : 'Something went wrong. Please try again.',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

module.exports = { errorHandler, notFoundHandler };
