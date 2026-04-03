const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/search.controller');

function makeRes() {
  return {
    statusCode: undefined,
    data: undefined,
    status(code) { this.statusCode = code; return this; },
    send(d) { this.data = d; if (!this.statusCode) this.statusCode = 200; }
  };
}

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    // --- Test data setup ---
    const choir = await db.choir.create({ name: 'Test Choir' });
    const composer1 = await db.composer.create({ name: 'Johann Sebastian Bach' });
    const composer2 = await db.composer.create({ name: 'Georg Friedrich Händel' });
    const category = await db.category.create({ name: 'Choral' });
    const publisher = await db.publisher.create({ name: 'Bärenreiter' });

    const collection1 = await db.collection.create({
      title: 'Gotteslob',
      prefix: 'GL',
      publisherId: publisher.id
    });
    const collection2 = await db.collection.create({
      title: 'Evangelisches Gesangbuch',
      prefix: 'EG',
      publisher: 'Bärenreiter'  // legacy string field
    });
    const collection3 = await db.collection.create({
      title: 'Carus Chorbuch',
      prefix: 'CB',
      publisher: 'Carus-Verlag'
    });

    const piece1 = await db.piece.create({
      title: 'Jesu meine Freude',
      composerId: composer1.id,
      categoryId: category.id,
      lyrics: 'Jesu meine Freude, meines Herzens Weide'
    });
    const piece2 = await db.piece.create({
      title: 'Wachet auf ruft uns die Stimme',
      composerId: composer1.id,
      categoryId: category.id
    });
    const piece3 = await db.piece.create({
      title: 'Hallelujah',
      composerId: composer2.id,
      lyrics: 'Hallelujah Hallelujah Hallelujah'
    });
    const piece4 = await db.piece.create({
      title: 'Stille Nacht',
      origin: 'Tradition'
    });
    const piece5 = await db.piece.create({
      title: 'Adeste Fideles',
      composerId: composer1.id,
      categoryId: category.id
    });

    // Link pieces to collections with numberInCollection
    await db.collection_piece.create({ pieceId: piece1.id, collectionId: collection1.id, numberInCollection: '245' });
    await db.collection_piece.create({ pieceId: piece2.id, collectionId: collection1.id, numberInCollection: '554' });
    await db.collection_piece.create({ pieceId: piece3.id, collectionId: collection2.id, numberInCollection: '100' });
    await db.collection_piece.create({ pieceId: piece4.id, collectionId: collection3.id, numberInCollection: '23a' });

    // Add pieces to choir repertoire
    await db.choir_repertoire.create({ choirId: choir.id, pieceId: piece1.id, status: 'active', rating: 5 });
    await db.choir_repertoire.create({ choirId: choir.id, pieceId: piece3.id, status: 'active' });

    await db.event.create({ choirId: choir.id, date: new Date(), type: 'SERVICE', notes: 'Weihnachtsgottesdienst' });

    console.log('--- Test data created ---');

    // ============================================
    // TEST 1: Search by lyrics
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'Herzens Weide' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T1: status 200');
      assert.ok(res.data.pieces.find(p => p.title === 'Jesu meine Freude'), 'T1: lyrics match finds piece');
      console.log('✓ T1: Search by lyrics');
    }

    // ============================================
    // TEST 2: Search by collection reference (GL245)
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'GL245' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T2: status 200');
      assert.ok(res.data.pieces.find(p => p.title === 'Jesu meine Freude'), 'T2: GL245 finds piece');
      console.log('✓ T2: Search by collection reference GL245');
    }

    // ============================================
    // TEST 3: Search by partial collection reference (GL5)
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'GL5' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T3: status 200');
      assert.ok(res.data.pieces.find(p => p.title === 'Wachet auf ruft uns die Stimme'), 'T3: GL5 finds GL554 piece');
      console.log('✓ T3: Search by partial collection reference GL5');
    }

    // ============================================
    // TEST 4: Search by composer name returns composerPieces
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'Bach' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T4: status 200');
      assert.ok(res.data.composerPieces, 'T4: composerPieces present');
      assert.ok(res.data.composerPieces.length > 0, 'T4: at least one composer group');
      const bachGroup = res.data.composerPieces.find(cp => cp.composer.name === 'Johann Sebastian Bach');
      assert.ok(bachGroup, 'T4: Bach group found');
      assert.ok(bachGroup.pieces.length > 0, 'T4: Bach pieces present');
      console.log('✓ T4: Composer search returns composerPieces');
    }

    // ============================================
    // TEST 5: Search by publisher name returns publisherCollections
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'Bärenreiter' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T5: status 200');
      assert.ok(res.data.publisherCollections, 'T5: publisherCollections present');
      assert.ok(res.data.publisherCollections.length > 0, 'T5: at least one publisher group');
      const baerenreiterGroup = res.data.publisherCollections.find(
        pc => pc.publisher.name === 'Bärenreiter'
      );
      assert.ok(baerenreiterGroup, 'T5: Bärenreiter group found');
      assert.ok(baerenreiterGroup.collections.length > 0, 'T5: Bärenreiter collections present');
      console.log('✓ T5: Publisher search returns publisherCollections');
    }

    // ============================================
    // TEST 6: Search by publisher also matches legacy string field
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'Carus' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T6: status 200');
      const hasCarusCollections = res.data.publisherCollections.some(
        pc => pc.publisher.name.includes('Carus')
      ) || res.data.collections.some(c => c.title === 'Carus Chorbuch');
      assert.ok(hasCarusCollections, 'T6: Carus collections found via legacy string field');
      console.log('✓ T6: Publisher legacy string field match');
    }

    // ============================================
    // TEST 7: Search by collection number only (245)
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: '245' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T7: status 200');
      console.log('✓ T7: Search by number only');
    }

    // ============================================
    // TEST 8: Suggestions - piece found by lyrics
    // ============================================
    {
      const res = makeRes();
      await controller.suggestions({ query: { q: 'Herzens' } }, res);
      assert.strictEqual(res.statusCode, 200, 'T8: status 200');
      const pieceSuggestion = res.data.suggestions.find(
        s => s.type === 'piece' && s.text === 'Jesu meine Freude'
      );
      assert.ok(pieceSuggestion, 'T8: piece found via lyrics in suggestions');
      console.log('✓ T8: Suggestions by lyrics');
    }

    // ============================================
    // TEST 9: Suggestions - piece found by collection reference
    // ============================================
    {
      const res = makeRes();
      await controller.suggestions({ query: { q: 'GL245' } }, res);
      assert.strictEqual(res.statusCode, 200, 'T9: status 200');
      const pieceSuggestion = res.data.suggestions.find(
        s => s.type === 'piece' && s.text === 'Jesu meine Freude'
      );
      assert.ok(pieceSuggestion, 'T9: piece found via collection reference in suggestions');
      console.log('✓ T9: Suggestions by collection reference');
    }

    // ============================================
    // TEST 10: Suggestions - composer found by name
    // ============================================
    {
      const res = makeRes();
      await controller.suggestions({ query: { q: 'Bach' } }, res);
      assert.strictEqual(res.statusCode, 200, 'T10: status 200');
      const composerSuggestion = res.data.suggestions.find(
        s => s.type === 'composer' && s.text.includes('Bach')
      );
      assert.ok(composerSuggestion, 'T10: composer found in suggestions');
      console.log('✓ T10: Suggestions for composer');
    }

    // ============================================
    // TEST 11: Suggestions - publisher found by name
    // ============================================
    {
      const res = makeRes();
      await controller.suggestions({ query: { q: 'Bären' } }, res);
      assert.strictEqual(res.statusCode, 200, 'T11: status 200');
      const pubSuggestion = res.data.suggestions.find(
        s => s.type === 'publisher' && s.text.includes('Bärenreiter')
      );
      assert.ok(pubSuggestion, 'T11: publisher found in suggestions');
      console.log('✓ T11: Suggestions for publisher');
    }

    // ============================================
    // TEST 12: Suggestions - collection found by prefix
    // ============================================
    {
      const res = makeRes();
      await controller.suggestions({ query: { q: 'GL' } }, res);
      assert.strictEqual(res.statusCode, 200, 'T12: status 200');
      const collSuggestion = res.data.suggestions.find(
        s => s.type === 'collection' && s.text === 'Gotteslob'
      );
      assert.ok(collSuggestion, 'T12: collection found by prefix in suggestions');
      console.log('✓ T12: Suggestions for collection by prefix');
    }

    // ============================================
    // TEST 13: Empty query returns 400
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: '' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 400, 'T13: empty query returns 400');
      console.log('✓ T13: Empty query returns 400');
    }

    // ============================================
    // TEST 14: Pieces rating enrichment
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'Jesu' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T14: status 200');
      const jesu = res.data.pieces.find(p => p.title === 'Jesu meine Freude');
      assert.ok(jesu, 'T14: piece found');
      assert.strictEqual(jesu.choir_repertoire.rating, 5, 'T14: rating enriched');
      console.log('✓ T14: Rating enrichment works');
    }

    // ============================================
    // TEST 15: composerPieces deduplicates direct matches
    // ============================================
    {
      const res = makeRes();
      // 'Jesu' matches piece title directly AND composer Bach -> Bach's other pieces
      await controller.search({ query: { q: 'Jesu' }, activeChoirId: choir.id }, res);
      const directIds = new Set(res.data.pieces.map(p => p.id));
      for (const cp of res.data.composerPieces || []) {
        for (const p of cp.pieces) {
          assert.ok(!directIds.has(p.id), `T15: piece ${p.id} should not be duplicated in composerPieces`);
        }
      }
      console.log('✓ T15: composerPieces deduplication');
    }

    // ============================================
    // TEST 16: Search with alphanumeric collection ref (CB23a)
    // ============================================
    {
      const res = makeRes();
      await controller.search({ query: { q: 'CB23a' }, activeChoirId: choir.id }, res);
      assert.strictEqual(res.statusCode, 200, 'T16: status 200');
      assert.ok(res.data.pieces.find(p => p.title === 'Stille Nacht'), 'T16: CB23a finds Stille Nacht');
      console.log('✓ T16: Alphanumeric collection reference CB23a');
    }

    console.log('\n=== All 16 tests passed! ===');
    await db.sequelize.close();
  } catch (err) {
    console.error('\n✗ TEST FAILED:', err.message);
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
