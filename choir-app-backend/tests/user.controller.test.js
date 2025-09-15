const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/user.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir1 = await db.choir.create({ name: 'Choir A' });
    const choir2 = await db.choir.create({ name: 'Choir B' });
    const user = await db.user.create({ email: 't@example.com', roles: ['user'] });
    await user.addChoir(choir1);
    await user.addChoir(choir2);

    const res = { status(code){ this.statusCode = code; return this; }, send(data){ this.data = data; } };
    await controller.getMe({ userId: user.id, activeChoirId: choir2.id }, res);

    assert.strictEqual(res.statusCode, 200, 'status 200');
    assert.strictEqual(res.data.activeChoir.id, choir2.id, 'activeChoir set');
    assert.strictEqual(res.data.availableChoirs.length, 2, 'all choirs returned');
    assert.ok(!res.data.choirs, 'original choirs property removed');

    console.log('user.controller.getMe test passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
