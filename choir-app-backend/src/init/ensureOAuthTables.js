const logger = require('../config/logger');
const db = require('../models');

const TABLES = [
    ['oauth_clients', 'oauth_client'],
    ['oauth_authorization_codes', 'oauth_authorization_code'],
    ['oauth_refresh_tokens', 'oauth_refresh_token'],
];

async function ensureOAuthTables() {
    logger.info('[Migration] Ensuring OAuth tables...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existing = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    for (const [pluralName, modelKey] of TABLES) {
        if (existing.has(pluralName) || existing.has(modelKey)) {
            logger.info(`[Migration] Table ${pluralName} already exists - skipping`);
            continue;
        }
        await db[modelKey].sync();
        logger.info(`[Migration] Created table: ${pluralName}`);
    }
}

module.exports = { ensureOAuthTables };
