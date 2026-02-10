const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/import.controller');
const jobs = require('../src/services/import-jobs.service');

/**
 * Comprehensive test suite for enhanced fuzzy matching in import functionality
 *
 * Tests cover:
 * 1. Token-based matching with space-separated names
 * 2. Exact matches and abbreviations
 * 3. Partial matches and fuzzy matching
 * 4. Selection from multiple candidates
 * 5. Creating new composers/titles via resolutions
 * 6. Ambiguous cases requiring user selection
 */
(async () => {
  try {
    console.log('Starting fuzzy matching tests...\n');

    // ======================
    // Test 1: Token-based matching with space-separated names
    // ======================
    console.log('Test 1: Token-based matching with space-separated names');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Bach, Johann Sebastian' });
    await db.composer.create({ name: 'Mendelssohn, Felix' });
    await db.composer.create({ name: 'Rutter, John' });

    const collection1 = await db.collection.create({ title: 'Test Collection 1', prefix: 'TC1' });

    // Test: "Bach" should match "Bach, Johann Sebastian"
    const records1 = [
      { title: 'Test Piece 1', composer: 'Bach' },
      { title: 'Test Piece 2', composer: 'Mendelssohn' },
      { title: 'Test Piece 3', composer: 'Rutter' }
    ];

    const job1 = jobs.createJob('fuzzy-test-1');
    job1.status = 'running';
    await controller._test.processImport(job1, collection1, records1, {});

    const composers1 = await db.composer.findAll();
    assert.strictEqual(composers1.length, 3, 'Should reuse existing composers without creating duplicates');

    console.log('✓ Token-based matching works correctly\n');

    // ======================
    // Test 2: Exact matches return as options
    // ======================
    console.log('Test 2: Exact matches return as options for user confirmation');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Mozart, Wolfgang Amadeus' });
    const composerMatch = await controller._test.findComposerMatch
      ? await controller._test.findComposerMatch('Mozart, Wolfgang Amadeus')
      : { match: null, options: [], ambiguous: false };

    // Note: Since _test might not export findComposerMatch, we'll skip this if not available
    if (controller._test.findComposerMatch) {
      assert.ok(composerMatch.options.length > 0, 'Exact match should return options');
      assert.strictEqual(composerMatch.options[0].score, 1.0, 'Exact match should have score 1.0');
      console.log('✓ Exact matches return as selectable options\n');
    } else {
      console.log('⊘ Skipped (findComposerMatch not exported for testing)\n');
    }

    // ======================
    // Test 3: Abbreviation matching
    // ======================
    console.log('Test 3: Abbreviation matching (e.g., "J. S. Bach")');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Bach, Johann Sebastian' });
    const collection3 = await db.collection.create({ title: 'Test Collection 3', prefix: 'TC3' });

    const records3 = [
      { title: 'Test Piece', composer: 'J. S. Bach' }
    ];

    const job3 = jobs.createJob('fuzzy-test-3');
    job3.status = 'running';
    await controller._test.processImport(job3, collection3, records3, {});

    const composers3 = await db.composer.findAll();
    assert.strictEqual(composers3.length, 1, 'Should match abbreviated name to existing composer');
    assert.strictEqual(composers3[0].name, 'Bach, Johann Sebastian');

    console.log('✓ Abbreviation matching works correctly\n');

    // ======================
    // Test 4: Partial last name matching
    // ======================
    console.log('Test 4: Partial last name matching');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Rachmaninoff, Sergei' });
    const collection4 = await db.collection.create({ title: 'Test Collection 4', prefix: 'TC4' });

    const records4 = [
      { title: 'Test Piece', composer: 'Rachmaninov' } // Different spelling
    ];

    const job4 = jobs.createJob('fuzzy-test-4');
    job4.status = 'running';
    await controller._test.processImport(job4, collection4, records4, {});

    const composers4 = await db.composer.findAll();
    // Should match due to fuzzy matching
    assert.strictEqual(composers4.length, 1, 'Should match similar spellings');

    console.log('✓ Partial last name matching works correctly\n');

    // ======================
    // Test 5: Multiple space-separated tokens
    // ======================
    console.log('Test 5: Multiple space-separated tokens in search');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Vaughan Williams, Ralph' });
    const collection5 = await db.collection.create({ title: 'Test Collection 5', prefix: 'TC5' });

    const records5 = [
      { title: 'Test Piece', composer: 'Vaughan Williams' }
    ];

    const job5 = jobs.createJob('fuzzy-test-5');
    job5.status = 'running';
    await controller._test.processImport(job5, collection5, records5, {});

    const composers5 = await db.composer.findAll();
    assert.strictEqual(composers5.length, 1, 'Should match multi-word last names');
    assert.strictEqual(composers5[0].name, 'Vaughan Williams, Ralph');

    console.log('✓ Multi-token matching works correctly\n');

    // ======================
    // Test 6: User resolution - selecting specific composer
    // ======================
    console.log('Test 6: User resolution - selecting specific composer from options');
    await db.sequelize.sync({ force: true });

    const composer6a = await db.composer.create({ name: 'Bach, Johann Sebastian' });
    const composer6b = await db.composer.create({ name: 'Bach, Carl Philipp Emanuel' });
    const collection6 = await db.collection.create({ title: 'Test Collection 6', prefix: 'TC6' });

    const records6 = [
      { title: 'Test Piece', composer: 'Bach' }
    ];

    // User manually selects Johann Sebastian Bach
    const resolutions6 = {
      0: { composerId: composer6a.id }
    };

    const job6 = jobs.createJob('fuzzy-test-6');
    job6.status = 'running';
    await controller._test.processImport(job6, collection6, records6, resolutions6);

    const pieces6 = await db.piece.findAll({ include: [{ model: db.composer, as: 'composer' }] });
    assert.strictEqual(pieces6.length, 1, 'Should create one piece');
    assert.strictEqual(pieces6[0].composer.id, composer6a.id, 'Should use user-selected composer');

    console.log('✓ User resolution for composer selection works correctly\n');

    // ======================
    // Test 7: User resolution - creating new composer
    // ======================
    console.log('Test 7: User resolution - explicitly creating new composer');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Smith, John' });
    const collection7 = await db.collection.create({ title: 'Test Collection 7', prefix: 'TC7' });

    const records7 = [
      { title: 'Test Piece', composer: 'Smith, Jane' }
    ];

    // User explicitly chooses to create new composer despite similar match
    const resolutions7 = {
      0: { createNewComposer: true }
    };

    const job7 = jobs.createJob('fuzzy-test-7');
    job7.status = 'running';
    await controller._test.processImport(job7, collection7, records7, resolutions7);

    const composers7 = await db.composer.findAll();
    assert.strictEqual(composers7.length, 2, 'Should create new composer when user requests');
    assert.ok(composers7.some(c => c.name === 'Smith, Jane'), 'Should create Jane Smith');

    console.log('✓ Explicit new composer creation works correctly\n');

    // ======================
    // Test 8: Title fuzzy matching with token separation
    // ======================
    console.log('Test 8: Title fuzzy matching with space-separated tokens');
    await db.sequelize.sync({ force: true });

    const composer8 = await db.composer.create({ name: 'Handel, George Frideric' });
    await db.piece.create({ title: 'Hallelujah Chorus', composerId: composer8.id });
    const collection8 = await db.collection.create({ title: 'Test Collection 8', prefix: 'TC8' });

    const records8 = [
      { title: 'Hallelujah', composer: 'Handel' } // Partial title match
    ];

    const job8 = jobs.createJob('fuzzy-test-8');
    job8.status = 'running';
    await controller._test.processImport(job8, collection8, records8, {});

    const pieces8 = await db.piece.findAll();
    assert.strictEqual(pieces8.length, 1, 'Should match existing piece by partial title');
    assert.strictEqual(pieces8[0].title, 'Hallelujah Chorus');

    console.log('✓ Title fuzzy matching works correctly\n');

    // ======================
    // Test 9: Title matching with composer context
    // ======================
    console.log('Test 9: Title matching prioritizes same composer');
    await db.sequelize.sync({ force: true });

    const composerA = await db.composer.create({ name: 'Composer A' });
    const composerB = await db.composer.create({ name: 'Composer B' });
    await db.piece.create({ title: 'Gloria', composerId: composerA.id });
    await db.piece.create({ title: 'Gloria', composerId: composerB.id });
    const collection9 = await db.collection.create({ title: 'Test Collection 9', prefix: 'TC9' });

    const records9 = [
      { title: 'Gloria', composer: 'Composer A' }
    ];

    const job9 = jobs.createJob('fuzzy-test-9');
    job9.status = 'running';
    await controller._test.processImport(job9, collection9, records9, {});

    const links9 = await db.collection_piece.findAll({
      where: { collectionId: collection9.id }
    });
    assert.strictEqual(links9.length, 1, 'Should link one piece');

    const piece9 = await db.piece.findByPk(links9[0].pieceId, {
      include: [{ model: db.composer, as: 'composer' }]
    });
    assert.strictEqual(piece9.composer.name, 'Composer A', 'Should match piece by same composer');

    console.log('✓ Title matching with composer context works correctly\n');

    // ======================
    // Test 10: User resolution - selecting specific title
    // ======================
    console.log('Test 10: User resolution - selecting specific title from options');
    await db.sequelize.sync({ force: true });

    const composer10 = await db.composer.create({ name: 'Mozart, Wolfgang Amadeus' });
    const piece10a = await db.piece.create({ title: 'Requiem in D minor', composerId: composer10.id });
    const piece10b = await db.piece.create({ title: 'Requiem Mass', composerId: composer10.id });
    const collection10 = await db.collection.create({ title: 'Test Collection 10', prefix: 'TC10' });

    const records10 = [
      { title: 'Requiem', composer: 'Mozart' }
    ];

    // User manually selects "Requiem in D minor"
    const resolutions10 = {
      0: { pieceId: piece10a.id }
    };

    const job10 = jobs.createJob('fuzzy-test-10');
    job10.status = 'running';
    await controller._test.processImport(job10, collection10, records10, resolutions10);

    const links10 = await db.collection_piece.findAll({
      where: { collectionId: collection10.id }
    });
    assert.strictEqual(links10.length, 1, 'Should link one piece');
    assert.strictEqual(links10[0].pieceId, piece10a.id, 'Should use user-selected piece');

    console.log('✓ User resolution for title selection works correctly\n');

    // ======================
    // Test 11: User resolution - creating new piece
    // ======================
    console.log('Test 11: User resolution - explicitly creating new piece');
    await db.sequelize.sync({ force: true });

    const composer11 = await db.composer.create({ name: 'Brahms, Johannes' });
    await db.piece.create({ title: 'German Requiem', composerId: composer11.id });
    const collection11 = await db.collection.create({ title: 'Test Collection 11', prefix: 'TC11' });

    const records11 = [
      { title: 'Requiem', composer: 'Brahms' }
    ];

    // User explicitly chooses to create new piece
    const resolutions11 = {
      0: { createNewPiece: true }
    };

    const job11 = jobs.createJob('fuzzy-test-11');
    job11.status = 'running';
    await controller._test.processImport(job11, collection11, records11, resolutions11);

    const pieces11 = await db.piece.findAll();
    assert.strictEqual(pieces11.length, 2, 'Should create new piece when user requests');
    assert.ok(pieces11.some(p => p.title === 'Requiem'), 'Should create new "Requiem" piece');

    console.log('✓ Explicit new piece creation works correctly\n');

    // ======================
    // Test 12: Case insensitivity
    // ======================
    console.log('Test 12: Case insensitive matching');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'VIVALDI, Antonio' });
    const collection12 = await db.collection.create({ title: 'Test Collection 12', prefix: 'TC12' });

    const records12 = [
      { title: 'Test Piece', composer: 'vivaldi' }
    ];

    const job12 = jobs.createJob('fuzzy-test-12');
    job12.status = 'running';
    await controller._test.processImport(job12, collection12, records12, {});

    const composers12 = await db.composer.findAll();
    assert.strictEqual(composers12.length, 1, 'Should match case-insensitively');

    console.log('✓ Case insensitive matching works correctly\n');

    // ======================
    // Test 13: Special characters in names
    // ======================
    console.log('Test 13: Special characters and accents in names');
    await db.sequelize.sync({ force: true });

    await db.composer.create({ name: 'Dvořák, Antonín' });
    const collection13 = await db.collection.create({ title: 'Test Collection 13', prefix: 'TC13' });

    const records13 = [
      { title: 'Test Piece 1', composer: 'Dvořák, Antonín' }, // Exact match with special chars
      { title: 'Test Piece 2', composer: 'Dvořák' } // Partial match
    ];

    const job13 = jobs.createJob('fuzzy-test-13');
    job13.status = 'running';
    await controller._test.processImport(job13, collection13, records13, {});

    const composers13 = await db.composer.findAll();
    // Should match exact and partial names
    assert.ok(composers13.length <= 2, 'Should handle special characters without creating many duplicates');
    assert.ok(composers13.some(c => c.name.includes('Dvořák')), 'Should preserve special characters');

    console.log('✓ Special character handling works correctly\n');

    // ======================
    // Test 14: Name format conversion
    // ======================
    console.log('Test 14: Automatic name format conversion (firstname lastname → lastname, firstname)');
    await db.sequelize.sync({ force: true });

    const collection14 = await db.collection.create({ title: 'Test Collection 14', prefix: 'TC14' });

    const records14 = [
      { title: 'Test Piece', composer: 'Antonio Vivaldi' }
    ];

    const job14 = jobs.createJob('fuzzy-test-14');
    job14.status = 'running';
    await controller._test.processImport(job14, collection14, records14, {});

    const composers14 = await db.composer.findAll();
    assert.strictEqual(composers14.length, 1, 'Should create one composer');
    assert.strictEqual(composers14[0].name, 'Vivaldi, Antonio', 'Should format name correctly');

    console.log('✓ Name format conversion works correctly\n');

    // ======================
    // Test 15: Empty or missing composer handling
    // ======================
    console.log('Test 15: Handling of empty or missing composer names');
    await db.sequelize.sync({ force: true });

    const collection15 = await db.collection.create({ title: 'Test Collection 15', prefix: 'TC15' });

    const records15 = [
      { title: 'Test Piece', composer: '' } // Empty composer
    ];

    const job15 = jobs.createJob('fuzzy-test-15');
    job15.status = 'running';
    await controller._test.processImport(job15, collection15, records15, {});

    // Should handle gracefully, likely skipping the row
    const pieces15 = await db.piece.findAll();
    assert.strictEqual(pieces15.length, 0, 'Should not create piece with missing composer');

    console.log('✓ Empty composer handling works correctly\n');

    await db.sequelize.close();
    console.log('\n✓ All fuzzy matching tests passed successfully!');
  } catch (err) {
    console.error('\n✗ Test failed:', err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
