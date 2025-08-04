const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const composerController = require('../src/controllers/composer.controller');
const authorController = require('../src/controllers/author.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const c1 = await db.composer.create({ name: 'J. Bach' });
    const c2 = await db.composer.create({ name: 'Johann Sebastian Bach' });
    await db.composer.create({ name: 'Ludwig van Beethoven' });

    const req = {};
    let status;
    const res = {
      status(code) { status = code; return this; },
      send(data) { this.data = data; if (!status) status = 200; }
    };

    await composerController.findDuplicates(req, res);
    assert.strictEqual(status, 200);
    assert.strictEqual(res.data.length, 1, 'one duplicate group');
    const names = res.data[0].map(r => r.name);
    assert(names.includes('J. Bach') && names.includes('Johann Sebastian Bach'));

    const piece = await db.piece.create({ title: 'Toccata', composerId: c1.id });
    await db.piece_arranger.create({ pieceId: piece.id, composerId: c1.id });
    await composerController.migrate({ body: { sourceId: c1.id, targetId: c2.id } }, res);
    assert.strictEqual(res.data.message.includes('Migration'), true);
    const migratedPiece = await db.piece.findByPk(piece.id);
    assert.strictEqual(migratedPiece.composerId, c2.id);
    const migratedArranger = await db.piece_arranger.findOne({ where: { pieceId: piece.id } });
    assert.strictEqual(migratedArranger.composerId, c2.id);
    const deletedComposer = await db.composer.findByPk(c1.id);
    assert.strictEqual(deletedComposer, null);

    const a1 = await db.author.create({ name: 'F. Schiller' });
    const a2 = await db.author.create({ name: 'Friedrich Schiller' });
    const p2 = await db.piece.create({ title: 'Ode', composerId: c2.id, authorId: a1.id });
    await authorController.findDuplicates(req, res);
    assert.strictEqual(res.data.length, 1, 'author duplicate group');
    await authorController.migrate({ body: { sourceId: a1.id, targetId: a2.id } }, res);
    const migratedPiece2 = await db.piece.findByPk(p2.id);
    assert.strictEqual(migratedPiece2.authorId, a2.id);
    const deletedAuthor = await db.author.findByPk(a1.id);
    assert.strictEqual(deletedAuthor, null);

    console.log('creator duplicate tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
