const logger = require('../config/logger');
const db = require('../models');

async function ensurePracticeListTables() {
    logger.info('[Migration] Ensuring practice list tables...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    if (!existingTables.has('practice_lists') && !existingTables.has('practice_list')) {
        await db.practice_list.sync();
        logger.info('[Migration] Created table: practice_lists');
    } else {
        logger.info('[Migration] Table practice_lists already exists - skipping');
    }

    if (!existingTables.has('practice_list_items') && !existingTables.has('practice_list_item')) {
        await db.practice_list_item.sync();
        logger.info('[Migration] Created table: practice_list_items');
    } else {
        logger.info('[Migration] Table practice_list_items already exists - skipping');
    }
}

module.exports = {
    ensurePracticeListTables
};
