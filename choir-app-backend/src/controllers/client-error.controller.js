const logger = require('../config/logger');

exports.reportError = (req, res) => {
  const { message, stack, url } = req.body || {};
  const origin = url || req.headers.referer || 'unknown';
  const logMessage = `Client Error at ${origin}: ${message}`;
  logger.error(logMessage);
  if (stack) {
    logger.error(stack);
  }
  res.status(200).send({ message: 'Error logged' });
};
