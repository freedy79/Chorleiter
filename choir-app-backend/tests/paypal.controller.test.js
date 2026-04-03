const assert = require('assert');

// Use in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';
// Encryption key needed by paypal-settings.service → encryption.service
process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

const db = require('../src/models');
const controller = require('../src/controllers/paypal.controller');
const paypalSettingsService = require('../src/services/paypal-settings.service');

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

    // === verifyPDT input validation ===

    // 1. Missing tx query param → 400
    {
      const res = makeRes();
      await controller.verifyPDT({ query: {} }, res);
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.data.message.includes('token'), 'mentions token');
      passed++;
    }

    // 2. No PDT token configured → 500 with configured:false
    {
      const res = makeRes();
      await controller.verifyPDT({ query: { tx: 'TEST-TX-123' } }, res);
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.data.configured, false, 'indicates not configured');
      passed++;
    }

    // === getPayPalSettings ===

    // 3. Default settings (nothing configured)
    {
      const res = makeRes();
      await controller.getPayPalSettings({}, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.pdtConfigured, false, 'PDT not configured');
      assert.strictEqual(res.data.mode, 'sandbox', 'default mode is sandbox');
      assert.strictEqual(res.data.donationEmail, null, 'no donation email');
      passed++;
    }

    // 4. After configuring settings
    {
      await paypalSettingsService.savePDTToken('MY-PDT-TOKEN');
      await paypalSettingsService.savePayPalMode('live');
      await paypalSettingsService.saveDonationEmail('donate@example.com');

      const res = makeRes();
      await controller.getPayPalSettings({}, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.pdtConfigured, true, 'PDT now configured');
      assert.strictEqual(res.data.mode, 'live');
      assert.strictEqual(res.data.donationEmail, 'donate@example.com');
      passed++;
    }

    // === paypal-settings.service unit tests ===

    // 5. getPDTToken returns decrypted token
    {
      const token = await paypalSettingsService.getPDTToken();
      assert.strictEqual(token, 'MY-PDT-TOKEN', 'token decrypted correctly');
      passed++;
    }

    // 6. savePDTToken with empty throws
    {
      let threw = false;
      try { await paypalSettingsService.savePDTToken(''); } catch (e) { threw = true; }
      assert.ok(threw, 'empty token throws');
      threw = false;
      try { await paypalSettingsService.savePDTToken(null); } catch (e) { threw = true; }
      assert.ok(threw, 'null token throws');
      passed++;
    }

    // 7. savePayPalMode validates input
    {
      let threw = false;
      try { await paypalSettingsService.savePayPalMode('invalid'); } catch (e) { threw = true; }
      assert.ok(threw, 'invalid mode throws');
      // Valid modes work
      await paypalSettingsService.savePayPalMode('sandbox');
      const mode = await paypalSettingsService.getPayPalMode();
      assert.strictEqual(mode, 'sandbox');
      passed++;
    }

    // 8. saveDonationEmail validates format
    {
      let threw = false;
      try { await paypalSettingsService.saveDonationEmail('not-an-email'); } catch (e) { threw = true; }
      assert.ok(threw, 'invalid email throws');
      threw = false;
      try { await paypalSettingsService.saveDonationEmail(''); } catch (e) { threw = true; }
      assert.ok(threw, 'empty email throws');
      passed++;
    }

    // === getDonationSummary ===

    // 9. Empty donations → zero total
    {
      const res = makeRes();
      await controller.getDonationSummary({}, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.totalLast12Months, 0);
      assert.strictEqual(res.data.donations.length, 0);
      passed++;
    }

    // 10. With donations in last 12 months
    {
      const user = await db.user.create({ email: 'donor@example.com' });
      await db.donation.create({ amount: 10.00, donatedAt: new Date(), userId: user.id });
      await db.donation.create({ amount: 25.50, donatedAt: new Date(), userId: user.id });
      // Old donation (beyond 12 months)
      const old = new Date();
      old.setFullYear(old.getFullYear() - 2);
      await db.donation.create({ amount: 100.00, donatedAt: old, userId: user.id });

      const res = makeRes();
      await controller.getDonationSummary({}, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.totalLast12Months, 35.50, 'sums recent donations');
      assert.strictEqual(res.data.donations.length, 2, 'only recent donations (max 3)');
      passed++;
    }

    // 11. Donation summary limits to 3 most recent
    {
      const user = await db.user.findOne();
      await db.donation.create({ amount: 5.00, donatedAt: new Date(), userId: user.id });
      await db.donation.create({ amount: 7.00, donatedAt: new Date(), userId: user.id });

      const res = makeRes();
      await controller.getDonationSummary({}, res);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.data.donations.length <= 3, 'max 3 donations returned');
      passed++;
    }

    console.log(`\n✅ paypal.controller.test: All ${passed} tests passed`);
    await db.sequelize.close();
  } catch (err) {
    console.error('❌ paypal.controller.test FAILED:', err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
