const logger = require('../config/logger');
const db = require('../models');

async function ensureChoirPublicPageTables() {
    try {
        logger.info('[Migration] Ensuring choir public page tables...');

        const queryInterface = db.sequelize.getQueryInterface();
        const existingTables = await queryInterface.showAllTables();
        const tableSet = new Set(existingTables.map(t => t.toLowerCase()));

        if (!tableSet.has('choir_public_pages') && !tableSet.has('choir_public_page')) {
            await db.choir_public_page.sync();
            logger.info('[Migration] Created table: choir_public_pages');
        }

        if (!tableSet.has('choir_public_assets') && !tableSet.has('choir_public_asset')) {
            await db.choir_public_asset.sync();
            logger.info('[Migration] Created table: choir_public_assets');
        }

        logger.info('[Migration] Choir public page tables ensured successfully');
    } catch (error) {
        logger.error('[Migration] Error ensuring choir public page tables:', error);
        throw error;
    }
}

module.exports = {
    ensureChoirPublicPageTables,
};
