const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/monthlyPlan.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir', modules: { dienstplan: true } });
    await db.plan_rule.create({ choirId: choir.id, dayOfWeek: 0 });
    const baseReq = { activeChoirId: choir.id };
    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.create({ ...baseReq, body: { year: 2025, month: 7 } }, res);
    assert.strictEqual(res.statusCode, 201);
    const planId = res.data.id;

    const entries = await db.plan_entry.findAll({ where: { monthlyPlanId: planId } });
    assert.ok(entries.length > 0);

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

    // Christmas rules
    const choir2 = await db.choir.create({ name: 'Xmas Choir', modules: { dienstplan: true } });
    await db.plan_rule.create({ choirId: choir2.id, dayOfWeek: 0 });
    const baseReq2 = { activeChoirId: choir2.id };
    await controller.create({ ...baseReq2, body: { year: 2021, month: 12 } }, res);
    const entries2021 = await db.plan_entry.findAll({ where: { monthlyPlanId: res.data.id } });
    const dates = entries2021.map(e => e.date.toISOString().split('T')[0]);
    assert.ok(dates.includes('2021-12-25'));
    assert.ok(!dates.includes('2021-12-26'));

    console.log('monthlyPlan controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
