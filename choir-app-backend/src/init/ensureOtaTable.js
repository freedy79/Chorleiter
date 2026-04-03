const db = require('../models');
const logger = require('../config/logger');

async function ensureOtaTable() {
  const qi = db.sequelize.getQueryInterface();
  try {
    await qi.describeTable('one_time_tokens');
  } catch {
    logger.info('Creating one_time_tokens table...');
    await db.one_time_token.sync({ force: true });
    logger.info('one_time_tokens table created.');
  }
}

module.exports = { ensureOtaTable };
