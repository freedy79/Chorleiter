const { syncDatabase } = require('./dbSync');
const { ensureJoinHashes } = require('./joinHashes');
const { seedDatabase } = require('../seed');
const { migrateRoles } = require('./migrateRoles');

async function init(options = {}) {
    const { includeDemoData = true, syncOptions = { alter: true } } = options;
    await migrateRoles();
    await syncDatabase(syncOptions);
    await ensureJoinHashes();
    await seedDatabase({ includeDemoData });
}

module.exports = {
    init,
    syncDatabase,
    ensureJoinHashes,
    migrateRoles,
};
