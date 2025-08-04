const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/search.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const composer = await db.composer.create({ name: 'Handel' });
    await db.piece.create({ title: 'Hallelujah', composerId: composer.id });
    await db.piece.create({ title: 'Freedom', lyrics: 'Words of hope and love', composerId: composer.id });
    await db.piece.create({ title: 'Folk', origin: 'Tradition' });
    await db.collection.create({ title: 'Advent', prefix: 'AD' });
    await db.event.create({ choirId: choir.id, date: new Date(), type: 'SERVICE', notes: 'Weekly service' });

    const req = { query: { q: 'hope' }, activeChoirId: choir.id };
    const res = { status(code) { this.statusCode = code; return this; }, send(d) { this.data = d; } };
    await controller.search(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.data.pieces.find(p => p.title === 'Freedom'));
    assert.strictEqual(res.data.collections.length, 0);

    const reqOrigin = { query: { q: 'Trad' }, activeChoirId: choir.id };
    await controller.search(reqOrigin, res);
    assert.ok(res.data.pieces.find(p => p.title === 'Folk'));

    console.log('search.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
