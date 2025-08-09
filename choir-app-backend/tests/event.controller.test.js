const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/event.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 't@example.com', roles: ['USER'] });
    const organist = await db.user.create({ email: 'o@example.com', roles: ['USER'] });
    const plan = await db.monthly_plan.create({ choirId: choir.id, year: 2024, month: 1 });

    const baseReq = { activeChoirId: choir.id, userId: user.id };
    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; },
    };

    // First event should succeed
    await controller.create({ ...baseReq, body: { date: '2024-01-01T10:00:00Z', type: 'SERVICE', pieceIds: [], organistId: organist.id, monthlyPlanId: plan.id } }, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.event.organistId, organist.id);

    // Same type on same day should be rejected
    await controller.create({ ...baseReq, body: { date: '2024-01-01T12:00:00Z', type: 'SERVICE', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 409);

    // Different type on same day should succeed with warning
    await controller.create({ ...baseReq, body: { date: '2024-01-01T15:00:00Z', type: 'REHEARSAL', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.data.warning);

    // Delete events in date range
    const delReq = {
      activeChoirId: choir.id,
      query: { start: '2024-01-01', end: '2024-01-02' }
    };
    await controller.deleteRange(delReq, res);
    assert.strictEqual(res.data.message.includes('events deleted'), true);

    // --- Update tests ---
    // create new event
    await controller.create({ ...baseReq, body: { date: '2024-01-02T10:00:00Z', type: 'SERVICE', notes: 'A', pieceIds: [] } }, res);
    const updateId = res.data.event.id;
    const initialUpdatedAt = new Date(res.data.event.updatedAt);

    // call update with identical data
    await controller.update({ ...baseReq, params: { id: updateId }, body: { date: '2024-01-02T10:00:00Z', type: 'SERVICE', notes: 'A', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 200);
    const afterNoChange = await db.event.findByPk(updateId);
    assert.strictEqual(afterNoChange.updatedAt.getTime(), initialUpdatedAt.getTime());

    // update with changed notes
    await controller.update({ ...baseReq, params: { id: updateId }, body: { date: '2024-01-02T10:00:00Z', type: 'SERVICE', notes: 'B', pieceIds: [] } }, res);
    assert.strictEqual(res.statusCode, 200);
    const afterChange = await db.event.findByPk(updateId);
    assert.notStrictEqual(afterChange.updatedAt.getTime(), initialUpdatedAt.getTime());

    // --- Next events tests ---
    const otherUser = await db.user.create({ email: 'other@example.com', roles: ['USER'] });
    await controller.create({ ...baseReq, body: { date: '2099-01-01T10:00:00Z', type: 'SERVICE', pieceIds: [] } }, res);
    const futureId = res.data.event.id;
    await controller.create({ ...baseReq, body: { date: '2099-01-02T10:00:00Z', type: 'REHEARSAL', pieceIds: [], directorId: otherUser.id } }, res);

    await controller.findNext({ ...baseReq, query: { limit: '1' } }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].id, futureId);

    await controller.findNext({ ...baseReq, query: { mine: 'true' } }, res);
    const ids = res.data.map(e => e.id);
    assert.ok(ids.includes(futureId));
    assert.ok(!ids.includes(res.data.find(e => e.id !== futureId)?.id || false));

    console.log('event.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
