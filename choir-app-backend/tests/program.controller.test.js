const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/program.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 'u@example.com', roles: ['USER'] });

    const req = {
      body: { title: 'Concert', description: 'Desc', startTime: '2024-01-01T10:00:00Z' },
      activeChoirId: choir.id,
      userId: user.id
    };
    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.create(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.title, 'Concert');
    assert.strictEqual(res.data.status, 'draft');
    assert.ok(Array.isArray(res.data.items));
    assert.strictEqual(res.data.items.length, 0);

    console.log('program.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
