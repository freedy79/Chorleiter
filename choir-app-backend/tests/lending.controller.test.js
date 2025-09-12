const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const libraryController = require('../src/controllers/library.controller');
const lendingController = require('../src/controllers/lending.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const collection = await db.collection.create({ title: 'Choir Book' });
    const createRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await libraryController.create({ body: { collectionId: collection.id, copies: 3 } }, createRes);
    const itemId = createRes.data.id;

    const pdfRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; }, setHeader() {} };
    await lendingController.downloadPdf({ params: { id: itemId } }, pdfRes);
    assert.strictEqual(pdfRes.statusCode, 200);
    assert.ok(Buffer.isBuffer(pdfRes.data));

    const copies = await db.lending.findAll({ where: { libraryItemId: itemId } });
    assert.strictEqual(copies.length, 3);

    const updateRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await lendingController.update({ params: { id: copies[0].id }, body: { borrowerName: 'Alice', status: 'borrowed' } }, updateRes);
    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.data.borrowerName, 'Alice');
    assert.strictEqual(updateRes.data.status, 'borrowed');

    const listRes = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };
    await lendingController.list({ params: { id: itemId } }, listRes);
    assert.strictEqual(listRes.statusCode, 200);
    assert.strictEqual(listRes.data.length, 3);
    assert.strictEqual(listRes.data[0].borrowerName, 'Alice');

    console.log('lending.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
