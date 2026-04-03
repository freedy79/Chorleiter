const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const lendingService = require('../src/services/lending.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    let passed = 0;

    // Create test data
    const collection = await db.collection.create({ title: 'EG', prefix: 'EG' });
    const libraryItem = await db.library_item.create({ collectionId: collection.id, copies: 5 });
    const user1 = await db.user.create({ email: 'singer@example.com', name: 'Singer', firstName: 'Anna' });
    const user2 = await db.user.create({ email: 'singer2@example.com', name: 'Müller', firstName: 'Hans' });

    // Create lending copies
    const copy1 = await db.lending.create({ libraryItemId: libraryItem.id, collectionId: collection.id, copyNumber: 1, status: 'available' });
    const copy2 = await db.lending.create({ libraryItemId: libraryItem.id, collectionId: collection.id, copyNumber: 2, status: 'available' });

    // === getCopyWithDetails ===

    // 1. Returns copy with details
    {
      const result = await lendingService.getCopyWithDetails(copy1.id);
      assert.ok(result, 'copy found');
      assert.strictEqual(result.copyNumber, 1);
      assert.strictEqual(result.status, 'available');
      passed++;
    }

    // 2. Returns null for non-existent copy
    {
      const result = await lendingService.getCopyWithDetails(9999);
      assert.strictEqual(result, null, 'non-existent returns null');
      passed++;
    }

    // === updateBorrower — Borrowing ===

    // 3. Borrow a copy by name
    {
      const result = await lendingService.updateBorrower(copy1.id, {
        borrowerName: 'Anna Singer',
        borrowerId: user1.id
      });
      assert.ok(result, 'result exists');
      assert.strictEqual(result.status, 'borrowed');
      assert.strictEqual(result.borrowerName, 'Anna Singer');
      assert.strictEqual(result.borrowerId, user1.id);
      assert.ok(result.borrowedAt, 'borrowedAt set');
      assert.strictEqual(result.returnedAt, null, 'returnedAt not set');
      passed++;
    }

    // 4. Borrow sets borrowedAt timestamp
    {
      const copy = await db.lending.findByPk(copy1.id);
      assert.ok(copy.borrowedAt instanceof Date, 'borrowedAt is a Date');
      passed++;
    }

    // 5. Borrow another copy
    {
      const result = await lendingService.updateBorrower(copy2.id, {
        borrowerName: 'Hans Müller',
        borrowerId: user2.id
      });
      assert.strictEqual(result.status, 'borrowed');
      assert.strictEqual(result.borrowerName, 'Hans Müller');
      passed++;
    }

    // === updateBorrower — Return ===

    // 6. Return a copy (set borrowerName to empty)
    {
      const result = await lendingService.updateBorrower(copy1.id, {
        borrowerName: ''
      });
      assert.strictEqual(result.status, 'available');
      assert.strictEqual(result.borrowerName, '');
      assert.strictEqual(result.borrowerId, null, 'borrowerId cleared');
      assert.ok(result.returnedAt, 'returnedAt set');
      passed++;
    }

    // 7. Return sets returnedAt timestamp
    {
      const copy = await db.lending.findByPk(copy1.id);
      assert.ok(copy.returnedAt instanceof Date, 'returnedAt is a Date');
      passed++;
    }

    // === updateBorrower — edge cases ===

    // 8. Non-existent copy returns null
    {
      const result = await lendingService.updateBorrower(9999, { borrowerName: 'Ghost' });
      assert.strictEqual(result, null, 'non-existent copy → null');
      passed++;
    }

    // 9. Update only borrowerId (without borrowerName change)
    {
      // First, borrow copy1 again
      await lendingService.updateBorrower(copy1.id, {
        borrowerName: 'Temp Name',
        borrowerId: user1.id
      });
      // Now update only borrowerId
      const result = await lendingService.updateBorrower(copy1.id, {
        borrowerId: user2.id
      });
      assert.ok(result, 'result exists');
      // borrowerName should not change, only borrowerId
      assert.strictEqual(result.borrowerId, user2.id, 'borrowerId updated');
      passed++;
    }

    // 10. Borrow-return-borrow cycle
    {
      // Return
      await lendingService.updateBorrower(copy1.id, { borrowerName: '' });
      const returned = await db.lending.findByPk(copy1.id);
      assert.strictEqual(returned.status, 'available');

      // Borrow again
      const result = await lendingService.updateBorrower(copy1.id, {
        borrowerName: 'Re-Borrowed',
        borrowerId: user1.id
      });
      assert.strictEqual(result.status, 'borrowed');
      assert.strictEqual(result.borrowerName, 'Re-Borrowed');
      assert.ok(result.borrowedAt, 'new borrowedAt set');
      assert.strictEqual(result.returnedAt, null, 'returnedAt cleared on re-borrow');
      passed++;
    }

    // 11. Empty payload doesn't change status
    {
      const before = await db.lending.findByPk(copy2.id);
      const result = await lendingService.updateBorrower(copy2.id, {});
      assert.ok(result, 'result exists');
      assert.strictEqual(result.status, before.status, 'status unchanged with empty payload');
      passed++;
    }

    console.log(`\n✅ lending.service.test: All ${passed} tests passed`);
    await db.sequelize.close();
  } catch (err) {
    console.error('❌ lending.service.test FAILED:', err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
