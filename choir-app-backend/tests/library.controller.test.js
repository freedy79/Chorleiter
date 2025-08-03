const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/library.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const piece = await db.piece.create({ title: 'Test Piece' });
    const collection = await db.collection.create({ title: 'Test Collection' });
    await collection.addPiece(piece, { through: { numberInCollection: '1' } });

    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; }
    };

    await controller.create({ body: { pieceId: piece.id, collectionId: collection.id, copies: 2, isBorrowed: true } }, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.collectionId, collection.id);
    assert.strictEqual(res.data.copies, 2);
    assert.strictEqual(res.data.status, 'borrowed');

    const listRes = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; }
    };
    await controller.findAll({}, listRes);
    assert.strictEqual(listRes.statusCode, 200);
    assert.strictEqual(listRes.data.length, 1);
    assert.strictEqual(listRes.data[0].collection.id, collection.id);

    console.log('library.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();

