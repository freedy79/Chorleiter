const { syncDatabase } = require('./dbSync');
const { ensureJoinHashes } = require('./joinHashes');
const { ensureMonthlyPlanIndexes } = require('./ensureMonthlyPlanIndexes');
const { seedDatabase } = require('../seed');
const { migrateRoles } = require('./migrateRoles');
const { assignAdminRole } = require('./assignAdminRole');
const { fixProgramPublishedFromIdColumn } = require('./fixProgramPublishedFromIdColumn');
const { migrateUserNames } = require('./migrateUserNames');
const { ensureDataEnrichmentTables } = require('./ensureDataEnrichmentTables');
const { ensurePwaConfig } = require('./ensurePwaConfig');
const { ensurePostImagePublicToken } = require('./ensurePostImagePublicToken');
const { ensurePollIsAnonymous } = require('./ensurePollIsAnonymous');

async function init(options = {}) {
    const { includeDemoData = true, syncOptions = {} } = options;
    // 1. Run manual migrations first (these handle complex schema changes)
    await ensurePwaConfig();
    // 2. Sync database (only creates missing tables, doesn't alter existing)
    await syncDatabase(syncOptions);
    // 3. Create tables that have FK dependencies on core tables (e.g. users)
    await ensureDataEnrichmentTables();
    // 3b. Ensure new columns on existing tables
    await ensurePostImagePublicToken();
    await ensurePollIsAnonymous();
    // 4. Then run data migrations on existing tables
    await migrateUserNames();
    await migrateRoles();
    await fixProgramPublishedFromIdColumn();
    await ensureMonthlyPlanIndexes();
    await ensureJoinHashes();
    // 5. Finally seed and assign roles
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
    ensureDataEnrichmentTables,
    ensurePwaConfig,
    ensurePostImagePublicToken,
    ensurePollIsAnonymous
};
