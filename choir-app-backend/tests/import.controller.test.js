const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/import.controller');
const jobs = require('../src/services/import-jobs.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const collection = await db.collection.create({ title: 'Coll', prefix: 'C' });
    const composer = await db.composer.create({ name: 'Composer' });
    const existing = await db.piece.create({ title: 'Existing', composerId: composer.id });
    await collection.addPiece(existing, { through: { numberInCollection: '10' } });

    const records = [
      { title: 'Piece A', composer: 'Composer' },
      { title: 'Piece B', composer: 'Composer' }
    ];
    const job = jobs.createJob('job1');
    job.status = 'running';
    await controller._test.processImport(job, collection, records);

    const links = await db.collection_piece.findAll({
      where: { collectionId: collection.id },
      order: [['numberInCollection', 'ASC']]
    });
    assert.deepStrictEqual(
      links.map(l => l.numberInCollection),
      ['10', '11', '12']
    );

    // Test name formatting for composer and author
    await db.sequelize.sync({ force: true });

    const collectionFmt = await db.collection.create({ title: 'Fmt', prefix: 'F' });
    const recordsFmt = [
      { title: 'Formatted Piece', composer: 'Johann Sebastian Bach', author: 'Martin Luther' }
    ];
    const jobFmt = jobs.createJob('jobFmt');
    jobFmt.status = 'running';
    await controller._test.processImport(jobFmt, collectionFmt, recordsFmt);

    const storedComposer = await db.composer.findOne();
    const storedAuthor = await db.author.findOne();
    assert.strictEqual(storedComposer.name, 'Bach, Johann Sebastian');
    assert.strictEqual(storedAuthor.name, 'Luther, Martin');

    // Test interpolation of abbreviated composer names
    await db.sequelize.sync({ force: true });

    const collectionAbbr = await db.collection.create({ title: 'Abbr', prefix: 'A' });
    const existingComp = await db.composer.create({ name: 'Bach, Johann Sebastian' });
    const recordsAbbr = [
      { title: 'Abbrev Piece', composer: 'J. S. Bach' }
    ];
    const jobAbbr = jobs.createJob('jobAbbr');
    jobAbbr.status = 'running';
    await controller._test.processImport(jobAbbr, collectionAbbr, recordsAbbr);
    const composers = await db.composer.findAll();
    assert.strictEqual(composers.length, 1, 'should reuse existing composer');
    assert.strictEqual(composers[0].id, existingComp.id);

    await db.sequelize.sync({ force: true });

    const collectionFuzzy = await db.collection.create({ title: 'Fuzzy', prefix: 'FZ' });
    const existingRutter = await db.composer.create({ name: 'Rutter, John' });
    const recordsFuzzy = [
      { title: 'Test Piece', composer: 'Rutter' }
    ];
    const jobFuzzy = jobs.createJob('jobFuzzy');
    jobFuzzy.status = 'running';
    await controller._test.processImport(jobFuzzy, collectionFuzzy, recordsFuzzy);
    const composersFuzzy = await db.composer.findAll();
    assert.strictEqual(composersFuzzy.length, 1, 'should match existing composer by last name');
    assert.strictEqual(composersFuzzy[0].id, existingRutter.id);

    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ email: 't@example.com', roles: ['user'] });
    const comp2 = await db.composer.create({ name: 'Composer' });
    const piece = await db.piece.create({ title: 'Piece', composerId: comp2.id });
    await choir.addPiece(piece); // create choir_repertoire link
    const collection2 = await db.collection.create({ title: 'Coll', prefix: 'X' });
    await piece.addCollection(collection2, { through: { numberInCollection: '1' } });

    const records2 = [
      { reference: 'X1', date: '01.01.2024' },
      { reference: 'X1', date: '01.01.2024' }
    ];
    const job2 = { id: 'job2', logs: [], status: 'running', progress: 0, total: records2.length };
    await controller._test.processEventImport(job2, 'SERVICE', records2, choir.id, user.id);

    const events = await db.event.findAll();
    assert.strictEqual(events.length, 1, 'should only create one event');
    const links2 = await db.event_pieces.count();
    assert.strictEqual(links2, 1, 'should only link piece once');

    const rep = await db.choir_repertoire.findOne({ where: { choirId: choir.id, pieceId: piece.id } });
    assert.strictEqual(rep.status, 'CAN_BE_SUNG', 'status should be updated');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
