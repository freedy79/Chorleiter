const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/monthlyPlan.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const baseReq = { activeChoirId: choir.id };
    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.create({ ...baseReq, body: { year: 2025, month: 7 } }, res);
    assert.strictEqual(res.statusCode, 201);
    const planId = res.data.id;

    await controller.findByMonth({ ...baseReq, params: { year: 2025, month: 7 } }, res);
    assert.strictEqual(res.statusCode, 200);

    await controller.findByMonth({ ...baseReq, params: { year: 2025, month: 8 } }, res);
    assert.strictEqual(res.statusCode, 204);

    await controller.finalize({ ...baseReq, params: { id: planId } }, res);
    assert.strictEqual(res.data.finalized, true);
    const versionAfter = res.data.version;

    await controller.reopen({ ...baseReq, params: { id: planId } }, res);
    assert.strictEqual(res.data.finalized, false);
    assert.strictEqual(res.data.version, versionAfter); // version should not change on reopen

    console.log('monthlyPlan controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
