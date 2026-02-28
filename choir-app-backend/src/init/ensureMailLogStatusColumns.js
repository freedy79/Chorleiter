/**
 * Migration: Add status and errorMessage columns to mail_logs table
 */
const db = require('../models');
const logger = require('../config/logger');

async function ensureMailLogStatusColumns() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const tableDescription = await qi.describeTable('mail_logs');

    if (!tableDescription.status) {
      logger.info('[Migration] Adding status column to mail_logs table...');
      await qi.addColumn('mail_logs', 'status', {
        type: db.Sequelize.STRING,
        allowNull: false,
        defaultValue: 'SENT'
      });

      await db.sequelize.query(
        'UPDATE mail_logs SET "status" = :status WHERE "status" IS NULL',
        { replacements: { status: 'SENT' } }
      );
    }

    if (!tableDescription.errorMessage) {
      logger.info('[Migration] Adding errorMessage column to mail_logs table...');
      await qi.addColumn('mail_logs', 'errorMessage', {
        type: db.Sequelize.TEXT,
        allowNull: true
      });
    }
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      logger.debug('[Migration] mail_logs table does not exist yet, skipping mail_log migration.');
      return;
    }
    logger.error('[Migration] Error ensuring mail_logs columns:', err);
    throw err;
  }
}

module.exports = { ensureMailLogStatusColumns };
