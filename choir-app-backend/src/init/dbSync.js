const db = require('../models');
const logger = require("../config/logger");

async function syncDatabase(options = { alter: true }) {
    logger.info('[dbSync] Syncing database...');
    await db.sequelize.sync(options);
    logger.info('[dbSync] Database synchronized.');
}

module.exports = { syncDatabase };
