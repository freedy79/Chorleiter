const logger = require('../config/logger');
const db = require('../models');

async function ensureAudioMarkerTable() {
    logger.info('[Migration] Ensuring audio_marker table...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    if (!existingTables.has('audio_markers') && !existingTables.has('audio_marker')) {
        await db.audio_marker.sync();
        logger.info('[Migration] Created table: audio_markers');
    } else {
        logger.info('[Migration] Table audio_markers already exists - skipping');
    }
}

module.exports = {
    ensureAudioMarkerTable
};
