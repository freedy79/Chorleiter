const { syncDatabase } = require('./dbSync');
const { ensureJoinHashes } = require('./joinHashes');
const { ensureMonthlyPlanIndexes } = require('./ensureMonthlyPlanIndexes');
const { seedDatabase } = require('../seed');
const { migrateRoles } = require('./migrateRoles');
const { assignAdminRole } = require('./assignAdminRole');
const { fixProgramPublishedFromIdColumn } = require('./fixProgramPublishedFromIdColumn');
const { migrateUserNames } = require('./migrateUserNames');
const { ensureDataEnrichmentTables } = require('./ensureDataEnrichmentTables');

async function init(options = {}) {
    const { includeDemoData = true, syncOptions = { alter: true } } = options;
    // 1. Sync database first to create all tables
    await syncDatabase(syncOptions);
    // 2. Then run migrations on existing tables
    await migrateUserNames();
    await migrateRoles();
    await fixProgramPublishedFromIdColumn();
    await ensureMonthlyPlanIndexes();
    await ensureJoinHashes();
    await ensureDataEnrichmentTables();
    // 3. Finally seed and assign roles
    await seedDatabase({ includeDemoData });
    await assignAdminRole();
}

module.exports = {
    init,
    syncDatabase,
    ensureJoinHashes,
    migrateRoles,
    migrateUserNames,
    assignAdminRole,
    fixProgramPublishedFromIdColumn,
    ensureMonthlyPlanIndexes,
    ensureDataEnrichmentTables
};
