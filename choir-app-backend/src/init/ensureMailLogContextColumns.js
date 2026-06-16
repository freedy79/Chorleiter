/**
 * Migration: Add trigger context columns to mail_logs table.
 * Columns: triggerUserId, triggerChoirId, triggerSource, triggerAction
 */
const db = require('../models');
const logger = require('../config/logger');

async function ensureMailLogContextColumns() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const tableDescription = await qi.describeTable('mail_logs');

    if (!tableDescription.triggerUserId) {
      logger.info('[Migration] Adding triggerUserId column to mail_logs table...');
      await qi.addColumn('mail_logs', 'triggerUserId', {
        type: db.Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableDescription.triggerChoirId) {
      logger.info('[Migration] Adding triggerChoirId column to mail_logs table...');
      await qi.addColumn('mail_logs', 'triggerChoirId', {
        type: db.Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableDescription.triggerSource) {
      logger.info('[Migration] Adding triggerSource column to mail_logs table...');
      await qi.addColumn('mail_logs', 'triggerSource', {
        type: db.Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableDescription.triggerAction) {
      logger.info('[Migration] Adding triggerAction column to mail_logs table...');
      await qi.addColumn('mail_logs', 'triggerAction', {
        type: db.Sequelize.STRING,
        allowNull: true
      });
    }
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      logger.debug('[Migration] mail_logs table does not exist yet, skipping context columns migration.');
      return;
    }
    logger.error('[Migration] Error ensuring mail_logs context columns:', err);
    throw err;
  }
}

module.exports = { ensureMailLogContextColumns };
