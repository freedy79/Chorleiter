const db = require('../models');

async function syncDatabase(options = { alter: true }) {
    await db.sequelize.sync(options);
    console.log('Database synchronized.');
}

module.exports = { syncDatabase };
