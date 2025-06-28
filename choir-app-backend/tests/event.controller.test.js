const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/event.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 't@example.com', role: 'USER' });

    const baseReq = { activeChoirId: choir.id, userId: user.id };
    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; },
    };

    // First event should succeed
    await controller.create({ ...baseReq, body: { date: '2024-01-01T10:00:00Z', type: 'SERVICE', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 201);

    // Same type on same day should be rejected
    await controller.create({ ...baseReq, body: { date: '2024-01-01T12:00:00Z', type: 'SERVICE', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 409);

    // Different type on same day should succeed with warning
    await controller.create({ ...baseReq, body: { date: '2024-01-01T15:00:00Z', type: 'REHEARSAL', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.data.warning);

    console.log('event.controller create test passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
