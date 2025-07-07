const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/availability.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 't@example.com' });
    await db.plan_rule.create({ choirId: choir.id, dayOfWeek: 5 }); // Fridays
    await db.plan_rule.create({ choirId: choir.id, dayOfWeek: 4 }); // Thursdays

    const baseReq = { activeChoirId: choir.id, userId: user.id };
    const res = { status(code) { this.statusCode = code; return this; }, send(d) { this.data = d; } };

    await controller.findByMonth({ ...baseReq, params: { year: 2025, month: 4 } }, res);
    assert.strictEqual(res.statusCode, 200);
    const aprilDates = res.data.map(a => a.date);
    assert.ok(!aprilDates.includes('2025-04-18'));

    await controller.findByMonth({ ...baseReq, params: { year: 2025, month: 5 } }, res);
    const mayDates = res.data.map(a => a.date);
    assert.ok(!mayDates.includes('2025-05-29'));

    await controller.findByMonth({ ...baseReq, params: { year: 2025, month: 12 } }, res);
    const decDates = res.data.map(a => a.date);
    assert.ok(!decDates.includes('2025-12-25'));
    assert.ok(!decDates.includes('2025-12-26'));

    console.log('availability.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
