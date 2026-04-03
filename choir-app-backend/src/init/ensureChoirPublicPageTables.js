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

        // Ensure colorScheme column exists on existing tables
        try {
            const tableName = db.choir_public_page.getTableName();
            const tableDesc = await queryInterface.describeTable(tableName);
            if (!tableDesc.colorScheme) {
                await queryInterface.addColumn(tableName, 'colorScheme', {
                    type: db.Sequelize.DataTypes.STRING,
                    allowNull: true,
                    defaultValue: 'elegant-light',
                });
                logger.info('[Migration] Added colorScheme column to ' + tableName);
            }
            if (!tableDesc.richBlocks) {
                await queryInterface.addColumn(tableName, 'richBlocks', {
                    type: db.Sequelize.DataTypes.JSON,
                    allowNull: false,
                    defaultValue: [],
                });
                logger.info('[Migration] Added richBlocks column to ' + tableName);
            }
        } catch (colErr) {
            logger.warn('[Migration] Could not check/add colorScheme column:', colErr.message);
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
