const db = require('../models');
const logger = require("../config/logger");

async function syncDatabase(options = {}) {
    logger.info('[dbSync] Syncing database (without alter - migrations handle schema changes)...');
    await db.sequelize.sync(options);
    logger.info('[dbSync] Database synchronized.');
}

module.exports = { syncDatabase };
