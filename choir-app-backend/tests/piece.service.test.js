const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const pieceService = require('../src/services/piece.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    let passed = 0;

    // Create test data
    const composer1 = await db.composer.create({ name: 'Bach' });
    const composer2 = await db.composer.create({ name: 'Mozart' });
    const author = await db.author.create({ name: 'Luther' });

    // === validatePieceData ===

    // 1. Valid data with composerId
    {
      const result = pieceService.validatePieceData({ title: 'Test', composerId: 1 });
      assert.ok(!result.error, 'no error for valid data with composerId');
      assert.strictEqual(result.mainComposerId, 1);
      passed++;
    }

    // 2. Valid data with composers array
    {
      const result = pieceService.validatePieceData({ title: 'Test', composers: [{ id: 5 }] });
      assert.ok(!result.error, 'no error for valid data with composers');
      assert.strictEqual(result.mainComposerId, 5);
      passed++;
    }

    // 3. Valid data with origin (no composer)
    {
      const result = pieceService.validatePieceData({ title: 'Folk', origin: 'Traditional' });
      assert.ok(!result.error, 'no error when origin provided');
      assert.strictEqual(result.mainComposerId, undefined);
      passed++;
    }

    // 4. Missing title → error
    {
      const result = pieceService.validatePieceData({ composerId: 1 });
      assert.ok(result.error, 'error when title missing');
      passed++;
    }

    // 5. Missing both composer and origin → error
    {
      const result = pieceService.validatePieceData({ title: 'Test' });
      assert.ok(result.error, 'error when no composer and no origin');
      passed++;
    }

    // 6. Empty title and no composer → error
    {
      const result = pieceService.validatePieceData({ title: '', composerId: null });
      assert.ok(result.error, 'error for empty title');
      passed++;
    }

    // === resolveAuthor ===

    // 7. Returns authorId if provided
    {
      const result = await pieceService.resolveAuthor(author.id, null);
      assert.strictEqual(result, author.id, 'returns existing authorId');
      passed++;
    }

    // 8. Creates author by name if no id
    {
      const result = await pieceService.resolveAuthor(null, 'New Author');
      assert.ok(result, 'returned an id');
      const found = await db.author.findByPk(result);
      assert.strictEqual(found.name, 'New Author');
      passed++;
    }

    // 9. findOrCreate returns existing author
    {
      const result = await pieceService.resolveAuthor(null, 'New Author');
      const count = await db.author.count({ where: { name: 'New Author' } });
      assert.strictEqual(count, 1, 'no duplicate created');
      passed++;
    }

    // 10. Returns null when neither id nor name
    {
      const result = await pieceService.resolveAuthor(null, null);
      assert.strictEqual(result, null);
      passed++;
    }

    // === assignComposers ===

    // 11. Creates piece_composer entries from composers array
    {
      const piece = await db.piece.create({ title: 'Comp Test', composerId: composer1.id });
      await pieceService.assignComposers(piece.id, [
        { id: composer1.id, type: 'Melodie' },
        { id: composer2.id, type: 'Arrangement' },
      ], composer1.id);
      const links = await db.piece_composer.findAll({ where: { pieceId: piece.id } });
      assert.strictEqual(links.length, 2, 'two composer links created');
      const types = links.map(l => l.type).sort();
      assert.deepStrictEqual(types, ['Arrangement', 'Melodie']);
      passed++;
    }

    // 12. Falls back to mainComposerId when composers is empty
    {
      const piece = await db.piece.create({ title: 'Fallback Test', composerId: composer1.id });
      await pieceService.assignComposers(piece.id, [], composer1.id);
      const links = await db.piece_composer.findAll({ where: { pieceId: piece.id } });
      assert.strictEqual(links.length, 1, 'one link from fallback');
      assert.strictEqual(links[0].composerId, composer1.id);
      passed++;
    }

    // 13. No links when no composers and no mainComposerId
    {
      const piece = await db.piece.create({ title: 'No Comp', origin: 'Trad.' });
      await pieceService.assignComposers(piece.id, [], null);
      const links = await db.piece_composer.findAll({ where: { pieceId: piece.id } });
      assert.strictEqual(links.length, 0, 'no links created');
      passed++;
    }

    // === createLinks ===

    // 14. Creates piece_link entries
    {
      const piece = await db.piece.create({ title: 'Link Test', composerId: composer1.id });
      await pieceService.createLinks(piece.id, [
        { url: 'https://example.com', description: 'Example' },
        { url: 'https://other.com', description: 'Other' },
      ]);
      const links = await db.piece_link.findAll({ where: { pieceId: piece.id } });
      assert.strictEqual(links.length, 2, 'two links created');
      passed++;
    }

    // 15. No links when array is empty
    {
      const piece = await db.piece.create({ title: 'No Links', composerId: composer1.id });
      await pieceService.createLinks(piece.id, []);
      const links = await db.piece_link.findAll({ where: { pieceId: piece.id } });
      assert.strictEqual(links.length, 0, 'no links from empty array');
      passed++;
    }

    // 16. No links when null
    {
      const piece = await db.piece.create({ title: 'Null Links', composerId: composer1.id });
      await pieceService.createLinks(piece.id, null);
      const links = await db.piece_link.findAll({ where: { pieceId: piece.id } });
      assert.strictEqual(links.length, 0, 'no links from null');
      passed++;
    }

    console.log(`\n✅ piece.service.test: All ${passed} tests passed`);
    await db.sequelize.close();
  } catch (err) {
    console.error('❌ piece.service.test FAILED:', err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
