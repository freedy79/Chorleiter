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
    const created = await db.piece.findByPk(res.data.id);
    assert.strictEqual(created.composerId, composer.id);
    assert.strictEqual(created.authorId, author.id);

    console.log('piece.controller create test passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();

