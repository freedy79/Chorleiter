const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const controller = require('../src/controllers/inventory.controller');

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

    // Create prerequisite data
    const collection = await db.collection.create({ title: 'EG', prefix: 'EG' });
    const libraryItem = await db.library_item.create({ collectionId: collection.id, copies: 0 });

    // === Physical Copies ===

    // 1. List physical copies (empty)
    {
      const res = makeRes();
      await controller.listPhysicalCopies({ params: { id: libraryItem.id } }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.length, 0, 'no copies initially');
      passed++;
    }

    // 2. List for non-existent library item → 404
    {
      const res = makeRes();
      await controller.listPhysicalCopies({ params: { id: 9999 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 3. Create physical copy
    let copyId;
    {
      const res = makeRes();
      await controller.createPhysicalCopy({
        params: { id: libraryItem.id },
        body: { quantity: 5, vendor: 'Carus', unitPrice: 12.50, condition: 'new' }
      }, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.quantity, 5);
      assert.strictEqual(res.data.vendor, 'Carus');
      assert.strictEqual(res.data.condition, 'new');
      copyId = res.data.id;
      // Check that recalcCopies updated the library item
      const item = await db.library_item.findByPk(libraryItem.id);
      assert.strictEqual(item.copies, 5, 'copies recalculated to 5');
      passed++;
    }

    // 4. Create physical copy for non-existent library item → 404
    {
      const res = makeRes();
      await controller.createPhysicalCopy({ params: { id: 9999 }, body: { quantity: 1 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 5. Create second physical copy and verify cumulative count
    {
      const res = makeRes();
      await controller.createPhysicalCopy({
        params: { id: libraryItem.id },
        body: { quantity: 3, vendor: 'Bärenreiter' }
      }, res);
      assert.strictEqual(res.statusCode, 201);
      const item = await db.library_item.findByPk(libraryItem.id);
      assert.strictEqual(item.copies, 8, 'copies recalculated to 5+3=8');
      passed++;
    }

    // 6. List physical copies (now has 2)
    {
      const res = makeRes();
      await controller.listPhysicalCopies({ params: { id: libraryItem.id } }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.length, 2);
      passed++;
    }

    // 7. Update physical copy
    {
      const res = makeRes();
      await controller.updatePhysicalCopy({
        params: { copyId },
        body: { quantity: 10, condition: 'worn' }
      }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.quantity, 10);
      assert.strictEqual(res.data.condition, 'worn');
      // Recalc: 10 + 3 = 13
      const item = await db.library_item.findByPk(libraryItem.id);
      assert.strictEqual(item.copies, 13, 'copies recalculated after update');
      passed++;
    }

    // 8. Update non-existent copy → 404
    {
      const res = makeRes();
      await controller.updatePhysicalCopy({ params: { copyId: 9999 }, body: { quantity: 1 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 9. Delete physical copy
    {
      const res = makeRes();
      await controller.deletePhysicalCopy({ params: { copyId } }, res);
      assert.strictEqual(res.statusCode, 204);
      // Recalc: only the second copy (3) remains
      const item = await db.library_item.findByPk(libraryItem.id);
      assert.strictEqual(item.copies, 3, 'copies recalculated after delete');
      passed++;
    }

    // 10. Delete non-existent copy → 404
    {
      const res = makeRes();
      await controller.deletePhysicalCopy({ params: { copyId: 9999 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // === Digital Licenses ===

    // 11. List digital licenses (empty)
    {
      const res = makeRes();
      await controller.listDigitalLicenses({ params: { id: libraryItem.id } }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.length, 0);
      passed++;
    }

    // 12. List for non-existent library item → 404
    {
      const res = makeRes();
      await controller.listDigitalLicenses({ params: { id: 9999 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 13. Create digital license
    let licenseId;
    {
      const res = makeRes();
      await controller.createDigitalLicense({
        params: { id: libraryItem.id },
        body: { licenseNumber: 'LIC-001', licenseType: 'print', quantity: 20, vendor: 'CCLI' }
      }, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.licenseNumber, 'LIC-001');
      assert.strictEqual(res.data.licenseType, 'print');
      assert.strictEqual(res.data.quantity, 20);
      licenseId = res.data.id;
      passed++;
    }

    // 14. Create license for non-existent library item → 404
    {
      const res = makeRes();
      await controller.createDigitalLicense({
        params: { id: 9999 },
        body: { licenseNumber: 'LIC-X' }
      }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 15. Create license with default type
    {
      const res = makeRes();
      await controller.createDigitalLicense({
        params: { id: libraryItem.id },
        body: { licenseNumber: 'LIC-002' }
      }, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.licenseType, 'print', 'default type is print');
      passed++;
    }

    // 16. Update digital license
    {
      const res = makeRes();
      await controller.updateDigitalLicense({
        params: { licenseId },
        body: { quantity: 50, vendor: 'SongSelect', notes: 'renewed' }
      }, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.quantity, 50);
      assert.strictEqual(res.data.vendor, 'SongSelect');
      assert.strictEqual(res.data.notes, 'renewed');
      passed++;
    }

    // 17. Update non-existent license → 404
    {
      const res = makeRes();
      await controller.updateDigitalLicense({ params: { licenseId: 9999 }, body: { quantity: 1 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 18. Delete digital license
    {
      const res = makeRes();
      await controller.deleteDigitalLicense({ params: { licenseId } }, res);
      assert.strictEqual(res.statusCode, 204);
      // Verify deletion
      const deleted = await db.digital_license.findByPk(licenseId);
      assert.strictEqual(deleted, null, 'license deleted');
      passed++;
    }

    // 19. Delete non-existent license → 404
    {
      const res = makeRes();
      await controller.deleteDigitalLicense({ params: { licenseId: 9999 } }, res);
      assert.strictEqual(res.statusCode, 404);
      passed++;
    }

    // 20. Default quantity is 1 for physical copy
    {
      const res = makeRes();
      await controller.createPhysicalCopy({
        params: { id: libraryItem.id },
        body: {}
      }, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.quantity, 1, 'default quantity is 1');
      passed++;
    }

    console.log(`\n✅ inventory.controller.test: All ${passed} tests passed`);
    await db.sequelize.close();
  } catch (err) {
    console.error('❌ inventory.controller.test FAILED:', err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
