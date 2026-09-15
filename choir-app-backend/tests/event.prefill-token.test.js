const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'this-is-a-very-secret-key-change-it-1234567890';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';

const db = require('../src/models');
const eventController = require('../src/controllers/event.controller');
const { encodeEventPrefillToken } = require('../src/utils/event-prefill-link');

function makeRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.data = payload;
      return this;
    }
  };
}

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const director = await db.user.create({ name: 'Director', firstName: 'Dir', email: 'dir@example.com' });
    await db.user_choir.create({ userId: director.id, choirId: choir.id, rolesInChoir: ['director'], registrationStatus: 'REGISTERED' });

    const monthlyPlan = await db.monthly_plan.create({ choirId: choir.id, year: 2026, month: 6 });
    const planEntryDate = new Date(Date.UTC(2026, 4, 4));
    const planEntry = await db.plan_entry.create({
      monthlyPlanId: monthlyPlan.id,
      date: planEntryDate,
      notes: 'Gottesdienst',
      directorId: director.id
    });

    const payload = {
      purpose: 'missing-service-event-prefill',
      choirId: choir.id,
      userId: director.id,
      planEntryId: planEntry.id,
      date: '2026-05-04',
      type: 'SERVICE',
      notes: 'Gottesdienst',
      directorId: director.id,
      monthlyPlanId: monthlyPlan.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
    const token = encodeEventPrefillToken(payload);

    // valid token
    const req = { params: { token }, userId: director.id, activeChoirId: choir.id };
    const res = makeRes();
    await eventController.resolveCreatePrefillToken(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.type, 'SERVICE');
    assert.strictEqual(res.data.directorId, director.id);
    assert.strictEqual(res.data.monthlyPlanId, monthlyPlan.id);

    // invalid user
    const wrongUserReq = { params: { token }, userId: director.id + 1, activeChoirId: choir.id };
    const wrongUserRes = makeRes();
    await eventController.resolveCreatePrefillToken(wrongUserReq, wrongUserRes);
    assert.strictEqual(wrongUserRes.statusCode, 403);

    // existing service event for same choir/date => conflict
    await db.event.create({
      choirId: choir.id,
      date: planEntryDate,
      type: 'SERVICE',
      directorId: director.id
    });

    const conflictRes = makeRes();
    await eventController.resolveCreatePrefillToken(req, conflictRes);
    assert.strictEqual(conflictRes.statusCode, 409);

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
