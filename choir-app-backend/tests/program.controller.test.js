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
    const pieceItem = addRes.data;
    assert.strictEqual(addRes.statusCode, 201);
    assert.strictEqual(pieceItem.pieceId, piece.id);
    assert.strictEqual(pieceItem.pieceTitleSnapshot, 'Song');
    assert.strictEqual(pieceItem.durationSec, 120);

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
    const freeItem = freeRes.data;
    assert.strictEqual(freeRes.statusCode, 201);
    assert.strictEqual(freeItem.pieceId, null);
    assert.strictEqual(freeItem.pieceTitleSnapshot, 'Free Song');
    assert.strictEqual(freeItem.instrument, 'Piano');
    assert.strictEqual(freeItem.performerNames, 'Alice');
    assert.strictEqual(freeItem.durationSec, 150);

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
    const breakItem = breakRes.data;
    assert.strictEqual(breakRes.statusCode, 201);
    assert.strictEqual(breakItem.type, 'break');
    assert.strictEqual(breakItem.durationSec, 300);
    assert.strictEqual(breakItem.note, 'Umbau Bühne');

    // reorder items
    const orderReq = {
      params: { id: res.data.id },
      body: { order: [breakItem.id, pieceItem.id, freeItem.id] },
    };
    const orderRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.reorderItems(orderReq, orderRes);
    assert.strictEqual(orderRes.statusCode, 200);
    assert.deepStrictEqual(orderRes.data.map(i => i.id), [breakItem.id, pieceItem.id, freeItem.id]);
    assert.strictEqual(orderRes.data[0].sortIndex, 0);

    // add a speech item
    const speechReq = {
      params: { id: res.data.id },
      body: {
        title: 'Welcome',
        source: 'Author',
        speaker: 'Bob',
        text: 'Welcome everyone',
        durationSec: 30,
      },
    };
    const speechRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.addSpeechItem(speechReq, speechRes);
    assert.strictEqual(speechRes.statusCode, 201);
    assert.strictEqual(speechRes.data.speechTitle, 'Welcome');
    assert.strictEqual(speechRes.data.speechSpeaker, 'Bob');
    assert.strictEqual(speechRes.data.durationSec, 30);

    console.log('program.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
