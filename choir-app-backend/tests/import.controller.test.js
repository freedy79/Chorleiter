const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/import.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 't@example.com', role: 'USER' });
    const composer = await db.composer.create({ name: 'Composer' });
    const piece = await db.piece.create({ title: 'Piece', composerId: composer.id });
    const collection = await db.collection.create({ title: 'Coll', prefix: 'X' });
    await piece.addCollection(collection, { through: { numberInCollection: '1' } });

    const records = [
      { reference: 'X1', date: '01.01.2024' },
      { reference: 'X1', date: '01.01.2024' }
    ];
    const job = { id: 'job', logs: [], status: 'running', progress: 0, total: records.length };
    await controller._test.processEventImport(job, 'SERVICE', records, choir.id, user.id);

    const events = await db.event.findAll();
    assert.strictEqual(events.length, 1, 'should only create one event');
    const links = await db.event_pieces.count();
    assert.strictEqual(links, 1, 'should only link piece once');

    console.log('import.controller duplicate handling test passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
