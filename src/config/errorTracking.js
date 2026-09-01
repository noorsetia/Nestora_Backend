const logger = require('./logger');
const env = require('./env');

const errorTracking = {
  init: () => {
    if (env.nodeEnv === 'production') {
      logger.info('Error tracking abstraction initialized for production monitoring.');
    }
  },

  captureException: (error, context = {}) => {
    logger.error(`[ErrorTracker] Exception captured: ${error.message}`, {
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
      ...context,
    });
  },

  captureMessage: (message, level = 'info', context = {}) => {
    if (logger[level]) {
      logger[level](`[ErrorTracker] ${message}`, context);
    } else {
      logger.info(`[ErrorTracker] ${message}`, context);
    }
  },
};

module.exports = errorTracking;
