const db = require('../models');
const logger = require('../config/logger');

async function ensureSystemSettingValueText() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const tableDescription = await qi.describeTable('system_settings');
    const valueCol = tableDescription.value;
    if (valueCol && valueCol.type && !valueCol.type.toLowerCase().includes('text')) {
      logger.info('[Migration] Changing system_settings.value from VARCHAR to TEXT...');
      await qi.changeColumn('system_settings', 'value', {
        type: db.Sequelize.TEXT,
        allowNull: true
      });
      logger.info('[Migration] system_settings.value changed to TEXT.');
    }
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      logger.debug('[Migration] system_settings table does not exist yet, skipping.');
      return;
    }
    logger.error('[Migration] Error ensuring system_settings.value TEXT:', err);
    throw err;
  }
}

module.exports = { ensureSystemSettingValueText };
