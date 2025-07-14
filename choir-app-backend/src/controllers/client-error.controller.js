const logger = require('../config/logger');

exports.reportError = (req, res) => {
  const { message, stack, url, file, line } = req.body || {};
  const origin = url || req.headers.referer || 'unknown';
  const userInfo = req.userId ? `user ${req.userId}` : 'anonymous';
  let locationInfo = '';
  if (file && line) {
    locationInfo = ` in ${file}:${line}`;
  } else if (file) {
    locationInfo = ` in ${file}`;
  }
  const logMessage = `Client Error at ${origin} (${userInfo})${locationInfo}: ${message}`;
  logger.error(logMessage);
  if (stack) {
    logger.error(stack);
  }
  res.status(200).send({ message: 'Error logged' });
};
