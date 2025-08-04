const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/library.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 'test@example.com' });
    const piece = await db.piece.create({ title: 'Test Piece' });
    const collection = await db.collection.create({ title: 'Test Collection' });
    await collection.addPiece(piece, { through: { numberInCollection: '1' } });
    const item = await db.library_item.create({ collectionId: collection.id, copies: 5 });

    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; }
    };

    await controller.requestLoan({
      body: { items: [{ libraryItemId: item.id, quantity: 2 }], startDate: '2024-01-01', endDate: '2024-02-01', reason: 'Test' },
      userId: user.id,
      activeChoirId: choir.id
    }, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.items.length, 1);
    assert.strictEqual(res.data.items[0].quantity, 2);
    assert.strictEqual(res.data.choirId, choir.id);
    assert.strictEqual(res.data.userId, user.id);

    console.log('loan-request.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
