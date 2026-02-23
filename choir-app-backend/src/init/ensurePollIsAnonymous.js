/**
 * Migration: Add isAnonymous column to polls table
 *
 * Adds the isAnonymous boolean flag to distinguish anonymous vs. public polls.
 * Existing polls default to anonymous (true).
 */
const db = require('../models');
const logger = require('../config/logger');

async function ensurePollIsAnonymous() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const tableDescription = await qi.describeTable('polls');

    if (tableDescription.isAnonymous) {
      logger.debug('[Migration] polls.isAnonymous column already exists, skipping.');
      return;
    }

    logger.info('[Migration] Adding isAnonymous column to polls table...');

    await qi.addColumn('polls', 'isAnonymous', {
      type: db.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    logger.info('[Migration] Added isAnonymous column to polls table.');
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      logger.debug('[Migration] polls table does not exist yet, skipping isAnonymous migration.');
      return;
    }
    logger.error('[Migration] Error ensuring polls.isAnonymous:', err);
    throw err;
  }
}

module.exports = { ensurePollIsAnonymous };
