const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const controller = require('../src/controllers/piece.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    // create composer, author and users
    const composer = await db.composer.create({ name: 'Test Composer' });
    const author = await db.author.create({ name: 'Test Author' });
    const user = await db.user.create({ email: 'user@example.com' });
    const admin = await db.user.create({ email: 'admin@example.com', role: 'admin' });

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
    send(data) { this.data = data; if (!statusCode) statusCode = 200; },
  };

  await controller.create(req, res);

  assert.strictEqual(statusCode, 201, 'should return 201');
  const created = await db.piece.findByPk(res.data.id);
  assert.strictEqual(created.composerId, composer.id);
  assert.strictEqual(created.authorId, author.id);

  // non-admin update should create change request
  await controller.update({
    params: { id: created.id },
    body: { title: 'New' },
    userRole: 'user',
    userId: user.id
  }, res);
  assert.strictEqual(statusCode, 202, 'non-admin update returns 202');
  const changes = await db.piece_change.count();
  assert.strictEqual(changes, 1, 'change request stored');
  const unchanged = await db.piece.findByPk(created.id);
  assert.strictEqual(unchanged.title, 'Test Piece');

  // admin update should modify the record
  statusCode = undefined;
  await controller.update({
    params: { id: created.id },
    body: { title: 'Updated' },
    userRole: 'admin',
    userId: admin.id
  }, res);
  assert.strictEqual(statusCode, 200, 'admin update returns 200');
  const updated = await db.piece.findByPk(created.id);
  assert.strictEqual(updated.title, 'Updated');

  // delete piece
  statusCode = undefined;
  await controller.delete({ params: { id: created.id } }, res);
  assert.strictEqual(res.data.message.includes('deleted'), true);
  const deleted = await db.piece.findByPk(created.id);
  assert.strictEqual(deleted, null);

    console.log('piece.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();

