const db = require('../models');
const logger = require("../config/logger");

async function syncDatabase(options = { alter: true }) {
    await db.sequelize.sync(options);
    logger.info('Database synchronized.');
}

module.exports = { syncDatabase };
