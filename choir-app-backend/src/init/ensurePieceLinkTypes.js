const logger = require('../config/logger');
const db = require('../models');

async function ensurePieceLinkTypes() {
    logger.info('[Migration] Ensuring FILE_DOWNLOAD value in enum_piece_links_type...');
    try {
        const [[typeExists]] = await db.sequelize.query(
            `SELECT 1 FROM pg_type WHERE typname = 'enum_piece_links_type' LIMIT 1`
        );

        if (!typeExists) {
            logger.info('[Migration] enum_piece_links_type not yet created - sync will handle it');
            return;
        }

        const [enumValues] = await db.sequelize.query(
            `SELECT enumlabel FROM pg_enum
             JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
             WHERE pg_type.typname = 'enum_piece_links_type'`
        );

        if (!enumValues.some(r => r.enumlabel === 'FILE_DOWNLOAD')) {
            await db.sequelize.query(
                `ALTER TYPE "enum_piece_links_type" ADD VALUE 'FILE_DOWNLOAD'`
            );
            logger.info('[Migration] Added FILE_DOWNLOAD to enum_piece_links_type');
        }
    } catch (err) {
        logger.warn('[Migration] ensurePieceLinkTypes failed:', err.message);
    }
}

module.exports = { ensurePieceLinkTypes };
