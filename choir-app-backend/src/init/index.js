const { syncDatabase } = require('./dbSync');
const { ensureJoinHashes } = require('./joinHashes');
const { seedDatabase } = require('../seed');
const { migrateRoles } = require('./migrateRoles');
const { assignAdminRole } = require('./assignAdminRole');
const { fixProgramPublishedFromIdColumn } = require('./fixProgramPublishedFromIdColumn');

async function init(options = {}) {
    const { includeDemoData = true, syncOptions = { alter: true } } = options;
    await migrateRoles();
    await fixProgramPublishedFromIdColumn();
    await syncDatabase(syncOptions);
    await ensureJoinHashes();
    await seedDatabase({ includeDemoData });
    await assignAdminRole();
}

module.exports = {
    init,
    syncDatabase,
    ensureJoinHashes,
    migrateRoles,
    assignAdminRole,
    fixProgramPublishedFromIdColumn,
};
