const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/piece.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    // create composer and author
    const composer = await db.composer.create({ name: 'Test Composer' });
    const author = await db.author.create({ name: 'Test Author' });

    const req = {
      body: {
        title: 'Test Piece',
        composerId: composer.id,
        authorId: author.id,
      },
    };

    let statusCode;
    const res = {
      status(code) { statusCode = code; return this; },
      send(data) { this.data = data; },
    };

    await controller.create(req, res);

    assert.strictEqual(statusCode, 201, 'should return 201');
    const createdId = res.data.id;
    const created = await db.piece.findByPk(createdId);
    assert.strictEqual(created.composerId, composer.id);
    assert.strictEqual(created.authorId, author.id);

    const resOne = { status(c){ this.statusCode=c; return this; }, send(d){ this.data=d; } };
    await controller.findOne({ params: { id: createdId } }, resOne);
    assert.strictEqual(resOne.statusCode, 200);
    assert.strictEqual(resOne.data.id, createdId);

    const resAll = { status(c){ this.statusCode=c; return this; }, send(d){ this.data=d; } };
    await controller.findAll({}, resAll);
    assert.strictEqual(resAll.statusCode, 200);
    assert.strictEqual(resAll.data.length, 1);

    await controller.update({ params: { id: createdId }, body: { title: 'Updated' }, userRole: 'admin' }, res);
    const updated = await db.piece.findByPk(createdId);
    assert.strictEqual(updated.title, 'Updated');

    await controller.delete({ params: { id: createdId } }, res);
    assert.ok(res.data.message.includes('deleted'));
    const afterDel = await db.piece.findByPk(createdId);
    assert.strictEqual(afterDel, null);

    console.log('piece.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();

