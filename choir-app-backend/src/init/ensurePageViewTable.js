const logger = require('../config/logger');
const db = require('../models');

async function ensurePageViewTable() {
    logger.info('[Migration] Ensuring page_views table...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    if (!existingTables.has('page_views')) {
        await db.page_view.sync();
        logger.info('[Migration] Created table: page_views');
    } else {
        logger.info('[Migration] Table page_views already exists - skipping');
    }
}

module.exports = {
    ensurePageViewTable
};
