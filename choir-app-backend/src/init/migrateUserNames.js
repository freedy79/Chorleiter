const db = require('../models');
const logger = require('../config/logger');

async function migrateUserNames() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const table = await qi.describeTable('users');
    if (table.firstName) {
      return; // migration already applied
    }
    await qi.addColumn('users', 'firstName', {
      type: db.Sequelize.STRING,
      allowNull: true,
    });
    const [users] = await db.sequelize.query('SELECT id, name FROM users');
    for (const user of users) {
      if (!user.name) continue;
      const parts = user.name.trim().split(/\s+/);
      const lastName = parts.pop();
      const firstName = parts.join(' ');
      await db.sequelize.query('UPDATE users SET name = :lastName, "firstName" = :firstName WHERE id = :id', {
        replacements: { lastName, firstName: firstName || null, id: user.id },
      });
    }
    logger.info(`Migrated user names for ${users.length} users.`);
  } catch (err) {
    // Table might not exist yet
  }
}

module.exports = { migrateUserNames };
