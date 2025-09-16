const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const controller = require('../src/controllers/join.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Join Test Choir', joinHash: 'token123', modules: {} });
    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; }
    };

    await controller.getJoinInfo({ params: { token: 'token123' } }, res);
    assert.strictEqual(res.statusCode, 404, 'join should be disabled by default');

    await choir.update({ modules: { joinByLink: true } });

    await controller.getJoinInfo({ params: { token: 'token123' } }, res);
    assert.strictEqual(res.statusCode, 200, 'join info should succeed when enabled');
    assert.strictEqual(res.data.choirName, 'Join Test Choir');

    await controller.joinChoir({ params: { token: 'token123' }, body: { firstName: 'Test', name: 'User', email: 'u@example.com', password: 'pw' } }, res);
    assert.strictEqual(res.statusCode, 201, 'join should succeed when enabled');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
