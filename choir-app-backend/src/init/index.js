const { syncDatabase } = require('./dbSync');
const { ensureJoinHashes } = require('./joinHashes');
const { seedDatabase } = require('../seed');

async function init(options = {}) {
    const { includeDemoData = true, syncOptions = { alter: true } } = options;
    await syncDatabase(syncOptions);
    await ensureJoinHashes();
    await seedDatabase({ includeDemoData });
}

module.exports = {
    init,
    syncDatabase,
    ensureJoinHashes,
};
