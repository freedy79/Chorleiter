const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/collection.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const collection = await db.collection.create({ title: 'Test Collection' });

    // initial 50 pieces
    for (let i = 1; i <= 50; i++) {
      const piece = await db.piece.create({ title: `P${i}` });
      await collection.addPiece(piece, { through: { numberInCollection: String(i) } });
    }

    const req = { body: { collectionIds: [collection.id] }, activeChoirId: choir.id };
    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.bulkAddToChoir(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(await choir.countPieces(), 50);

    // add 3 new pieces to collection
    for (let i = 51; i <= 53; i++) {
      const piece = await db.piece.create({ title: `P${i}` });
      await collection.addPiece(piece, { through: { numberInCollection: String(i) } });
    }

    await controller.bulkAddToChoir(req, res);
    assert.strictEqual(await choir.countPieces(), 53);

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
