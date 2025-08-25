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

    // create a piece to add
    const piece = await db.piece.create({ title: 'Song' });

    const addReq = {
      params: { id: res.data.id },
      body: {
        pieceId: piece.id,
        title: piece.title,
        composer: 'Anon',
        durationSec: 120,
      },
    };
    const addRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.addPieceItem(addReq, addRes);
    assert.strictEqual(addRes.statusCode, 201);
    assert.strictEqual(addRes.data.pieceId, piece.id);
    assert.strictEqual(addRes.data.pieceTitleSnapshot, 'Song');
    assert.strictEqual(addRes.data.durationSec, 120);

    // add a free piece
    const freeReq = {
      params: { id: res.data.id },
      body: {
        title: 'Free Song',
        composer: 'Anon',
        instrument: 'Piano',
        performerNames: 'Alice',
        durationSec: 150,
        note: 'Solo',
      },
    };
    const freeRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.addFreePieceItem(freeReq, freeRes);
    assert.strictEqual(freeRes.statusCode, 201);
    assert.strictEqual(freeRes.data.pieceId, null);
    assert.strictEqual(freeRes.data.pieceTitleSnapshot, 'Free Song');
    assert.strictEqual(freeRes.data.instrument, 'Piano');
    assert.strictEqual(freeRes.data.performerNames, 'Alice');
    assert.strictEqual(freeRes.data.durationSec, 150);

    // add a break
    const breakReq = {
      params: { id: res.data.id },
      body: {
        durationSec: 300,
        note: 'Umbau Bühne',
      },
    };
    const breakRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.addBreakItem(breakReq, breakRes);
    assert.strictEqual(breakRes.statusCode, 201);
    assert.strictEqual(breakRes.data.type, 'break');
    assert.strictEqual(breakRes.data.durationSec, 300);
    assert.strictEqual(breakRes.data.note, 'Umbau Bühne');

    console.log('program.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
