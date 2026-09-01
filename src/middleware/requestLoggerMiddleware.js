const crypto = require('crypto');
const logger = require('../config/logger');

const requestLoggerMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${crypto.randomBytes(4).toString('hex')}`;
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    if (duration > 1000) {
      logger.warn(`[SLOW REQUEST] ${req.method} ${req.originalUrl} took ${duration}ms`, meta);
    } else {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, meta);
    }
  });

  next();
};

module.exports = requestLoggerMiddleware;
