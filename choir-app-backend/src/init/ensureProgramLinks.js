const db = require('../models');
const logger = require('../config/logger');

async function ensureProgramLinks() {
  const qi = db.sequelize.getQueryInterface();

  try {
    const eventsTable = await qi.describeTable('events');
    if (!eventsTable.program_id && !eventsTable.programId) {
      logger.info('[Migration] Adding events.program_id column...');
      await qi.addColumn('events', 'program_id', {
        type: db.Sequelize.UUID,
        allowNull: true,
      });
      logger.info('[Migration] Added events.program_id column.');
    } else {
      logger.debug('[Migration] events.program_id already exists, skipping.');
    }
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      logger.debug('[Migration] events table does not exist yet, skipping events.program_id migration.');
    } else {
      logger.error('[Migration] Error ensuring events.program_id:', err);
      throw err;
    }
  }

  try {
    const planEntriesTable = await qi.describeTable('plan_entries');
    if (!planEntriesTable.program_id && !planEntriesTable.programId) {
      logger.info('[Migration] Adding plan_entries.program_id column...');
      await qi.addColumn('plan_entries', 'program_id', {
        type: db.Sequelize.UUID,
        allowNull: true,
      });
      logger.info('[Migration] Added plan_entries.program_id column.');
    } else {
      logger.debug('[Migration] plan_entries.program_id already exists, skipping.');
    }
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      logger.debug('[Migration] plan_entries table does not exist yet, skipping plan_entries.program_id migration.');
    } else {
      logger.error('[Migration] Error ensuring plan_entries.program_id:', err);
      throw err;
    }
  }
}

module.exports = { ensureProgramLinks };
