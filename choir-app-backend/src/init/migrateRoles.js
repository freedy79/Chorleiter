const db = require('../models');
const logger = require("../config/logger");

async function migrateRoles() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const table = await qi.describeTable('users');
    if (!table.role) {
      return; // nothing to migrate
    }
    // ensure roles column exists
    if (!table.roles) {
      await qi.addColumn('users', 'roles', {
        type: db.Sequelize.JSON,
        allowNull: false,
        defaultValue: ['director'],
      });
    }
    const [users] = await db.sequelize.query('SELECT id, role, roles FROM users');
    for (const user of users) {
      let roles = user.roles;
      if (!Array.isArray(roles) || roles.length === 0) {
        roles = user.role ? [user.role] : ['director'];
        await db.sequelize.query('UPDATE users SET roles = :roles WHERE id = :id', {
          replacements: { roles: JSON.stringify(roles), id: user.id },
        });
      }
    }
    await qi.removeColumn('users', 'role');
    logger.info(`Migrated role to roles for ${users.length} users.`);
  } catch (err) {
    // Table does not exist or other error, ignore
  }
}

module.exports = { migrateRoles };
