const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const controller = require('../src/controllers/repertoire.controller');

function makeRes() {
  let _status;
  return {
    status(code) { _status = code; return this; },
    send(data) { this.data = data; if (!_status) _status = 200; },
    get statusCode() { return _status; },
  };
}

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    let passed = 0;

    // Create test data
    const composer = await db.composer.create({ name: 'Bach' });
    const author = await db.author.create({ name: 'Luther' });
    const category = await db.category.create({ name: 'Choral' });
    const user = await db.user.create({ email: 'test@example.com', name: 'Test', firstName: 'User' });
    const choir = await db.choir.create({ name: 'Test Choir' });

    const piece1 = await db.piece.create({ title: 'Jesu meine Freude', composerId: composer.id, authorId: author.id, categoryId: category.id });
    const piece2 = await db.piece.create({ title: 'Ein feste Burg', composerId: composer.id, origin: 'Evangelisch' });
    const piece3 = await db.piece.create({ title: 'Not in repertoire', composerId: composer.id });

    // Add pieces 1 and 2 to choir repertoire
    await db.choir_repertoire.create({ choirId: choir.id, pieceId: piece1.id, status: 'CAN_BE_SUNG' });
    await db.choir_repertoire.create({ choirId: choir.id, pieceId: piece2.id, status: 'IN_REHEARSAL' });

    // Create a collection and link piece1 to it
    const collection = await db.collection.create({ title: 'Choralbuch', prefix: 'CB' });
    await db.collection_piece.create({ collectionId: collection.id, pieceId: piece1.id, numberInCollection: 42 });

    // === lookup ===

    // 1. Lookup returns pieces in choir repertoire
    {
      const res = makeRes();
      await controller.lookup({ activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.length, 2, '2 pieces in repertoire');
      // Check structure
      const first = res.data.find(p => p.id === piece1.id);
      assert.ok(first, 'piece1 found');
      assert.strictEqual(first.title, 'Jesu meine Freude');
      assert.strictEqual(first.composerName, 'Bach');
      assert.strictEqual(first.reference, 'CB42');
      assert.strictEqual(first.collectionTitle, 'Choralbuch');
      passed++;
    }

    // 2. Lookup for non-existent choir → 404
    {
      const res = makeRes();
      await controller.lookup({ activeChoirId: 9999 }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 3. Lookup returns piece without collection reference as null
    {
      const res = makeRes();
      await controller.lookup({ activeChoirId: choir.id }, res);
      const second = res.data.find(p => p.id === piece2.id);
      assert.ok(second, 'piece2 found');
      assert.strictEqual(second.reference, null, 'no collection reference');
      assert.strictEqual(second.collectionTitle, null);
      passed++;
    }

    // === updateStatus ===

    // 4. Update status of a piece in repertoire
    {
      const res = makeRes();
      await controller.updateStatus({
        body: { pieceId: piece1.id, status: 'NOT_READY' },
        activeChoirId: choir.id,
        userId: user.id
      }, res);
      assert.strictEqual(res.statusCode, 200);
      // Verify in DB
      const link = await db.choir_repertoire.findOne({ where: { choirId: choir.id, pieceId: piece1.id } });
      assert.strictEqual(link.status, 'NOT_READY', 'status updated');
      // Verify log entry created
      const log = await db.choir_log.findOne({ where: { choirId: choir.id, action: 'repertoire_update_status' } });
      assert.ok(log, 'log entry created');
      passed++;
    }

    // === updateNotes ===

    // 5. Update notes of a piece in repertoire
    {
      const res = makeRes();
      await controller.updateNotes({
        body: { pieceId: piece1.id, notes: 'Practice alto part' },
        activeChoirId: choir.id,
        userId: user.id
      }, res);
      assert.strictEqual(res.statusCode, 200);
      const link = await db.choir_repertoire.findOne({ where: { choirId: choir.id, pieceId: piece1.id } });
      assert.strictEqual(link.notes, 'Practice alto part');
      passed++;
    }

    // === updateRating ===

    // 6. Update rating of a piece in repertoire
    {
      const res = makeRes();
      await controller.updateRating({
        body: { pieceId: piece1.id, rating: 4 },
        activeChoirId: choir.id,
        userId: user.id
      }, res);
      assert.strictEqual(res.statusCode, 200);
      const link = await db.choir_repertoire.findOne({ where: { choirId: choir.id, pieceId: piece1.id } });
      assert.strictEqual(link.rating, 4);
      passed++;
    }

    // === addPieceToRepertoire ===

    // 7. Add a new piece to repertoire
    {
      const res = makeRes();
      await controller.addPieceToRepertoire({
        body: { pieceId: piece3.id },
        activeChoirId: choir.id,
        userId: user.id
      }, res);
      assert.strictEqual(res.statusCode, 200);
      const link = await db.choir_repertoire.findOne({ where: { choirId: choir.id, pieceId: piece3.id } });
      assert.ok(link, 'piece3 now in repertoire');
      // Log entry
      const log = await db.choir_log.findOne({
        where: { choirId: choir.id, action: 'repertoire_add_piece' }
      });
      assert.ok(log, 'add piece log entry created');
      passed++;
    }

    // === findOne ===

    // 8. FindOne returns piece with all associations
    {
      const res = makeRes();
      await controller.findOne({
        params: { id: piece1.id },
        activeChoirId: choir.id
      }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.title, 'Jesu meine Freude');
      assert.strictEqual(res.data.composer.name, 'Bach');
      assert.strictEqual(res.data.author.name, 'Luther');
      assert.strictEqual(res.data.category.name, 'Choral');
      assert.ok(res.data.choir_repertoire, 'repertoire info included');
      assert.ok(Array.isArray(res.data.collections), 'collections included');
      assert.ok(Array.isArray(res.data.notes), 'notes array included');
      passed++;
    }

    // 9. FindOne for non-existent piece → 404
    {
      const res = makeRes();
      await controller.findOne({ params: { id: 9999 }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 10. FindOne for piece not in repertoire (no choir_repertoire field)
    {
      // Remove piece3 from repertoire first
      await db.choir_repertoire.destroy({ where: { choirId: choir.id, pieceId: piece3.id } });
      const res = makeRes();
      await controller.findOne({ params: { id: piece3.id }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.choir_repertoire, undefined, 'no repertoire info for non-member');
      passed++;
    }

    // === Lookup after changes ===

    // 11. Lookup now reflects updated status/notes
    {
      const res = makeRes();
      await controller.lookup({ activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200);
      // piece1 and piece2 remain (piece3 was removed)
      assert.strictEqual(res.data.length, 2);
      passed++;
    }

    console.log(`\n✅ repertoire.controller.test: All ${passed} tests passed`);
    await db.sequelize.close();
  } catch (err) {
    console.error('❌ repertoire.controller.test FAILED:', err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
