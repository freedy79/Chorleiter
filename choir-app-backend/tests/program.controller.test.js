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

    // update duration of piece item
    const updReq = {
      params: { id: res.data.id, itemId: pieceItem.id },
      body: { durationSec: 180, note: 'updated note' },
      userId: user.id,
    };
    const updRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.updateItem(updReq, updRes);
    assert.strictEqual(updRes.statusCode, 200);
    assert.strictEqual(updRes.data.durationSec, 180);
    assert.strictEqual(updRes.data.note, 'updated note');

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

    // delete free piece item
    const delItemReq = { params: { id: res.data.id, itemId: freeItem.id }, userId: user.id };
    const delItemRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await controller.deleteItem(delItemReq, delItemRes);
    assert.strictEqual(delItemRes.statusCode, 204);
    const afterDeleteItems = await db.program_item.findAll({ where: { programId: res.data.id } });
    assert.strictEqual(afterDeleteItems.length, 2);

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

      // publish program
      const publishReq = { params: { id: res.data.id }, userId: user.id };
      const publishRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
      await controller.publish(publishReq, publishRes);
      assert.strictEqual(publishRes.statusCode, 200);
      assert.strictEqual(publishRes.data.status, 'published');
      assert.ok(publishRes.data.publishedAt);

      // modifying after publish should create a revision
      const afterReq = {
        params: { id: publishRes.data.id },
        body: { durationSec: 60, note: 'after publish' },
        userId: user.id
      };
      const afterRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
      await controller.addBreakItem(afterReq, afterRes);
      assert.strictEqual(afterRes.statusCode, 201);
      assert.notStrictEqual(afterRes.data.programId, publishRes.data.id);
      const newProgram = await db.program.findByPk(afterRes.data.programId);
      assert.strictEqual(newProgram.publishedFromId, publishRes.data.id);
      assert.strictEqual(newProgram.status, 'draft');

      // delete program
      const delReq = { params: { id: afterRes.data.programId } };
      const delRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
      await controller.delete(delReq, delRes);
      assert.strictEqual(delRes.statusCode, 204);
      const deleted = await db.program.findByPk(afterRes.data.programId);
      assert.strictEqual(deleted, null);
      const itemsAfterDelete = await db.program_item.findAll({ where: { programId: afterRes.data.programId } });
      assert.strictEqual(itemsAfterDelete.length, 0);

      console.log('program.controller tests passed');
      await db.sequelize.close();
    } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
