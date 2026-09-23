const logger = require('../config/logger');
const db = require('../models');

async function ensureChoirApiTokenTables() {
    logger.info('[Migration] Ensuring choir API token tables...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    if (!existingTables.has('choir_api_tokens') && !existingTables.has('choir_api_token')) {
        await db.choir_api_token.sync();
        logger.info('[Migration] Created table: choir_api_tokens');
        return;
    }

    const table = await queryInterface.describeTable('choir_api_tokens');
    const columns = {
        allowWrite: { type: db.Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        writeCount: { type: db.Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        lastUsedIp: { type: db.Sequelize.STRING, allowNull: true },
        expiryNotifiedAt: { type: db.Sequelize.DATE, allowNull: true },
        renewedAt: { type: db.Sequelize.DATE, allowNull: true },
        renewCount: { type: db.Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        revokedAt: { type: db.Sequelize.DATE, allowNull: true },
        revokedByUserId: { type: db.Sequelize.INTEGER, allowNull: true },
    };

    for (const [name, definition] of Object.entries(columns)) {
        if (!table[name]) {
            await queryInterface.addColumn('choir_api_tokens', name, definition);
            logger.info(`[Migration] Added column choir_api_tokens.${name}`);
        }
    }
}

module.exports = {
    ensureChoirApiTokenTables
};
