const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
const db = require('../src/models');
const controller = require('../src/controllers/password-reset.controller');
const emailService = require('../src/services/email.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    await db.user.create({ name: 'User', email: 'user@example.com' });

    let called = 0;
    emailService.sendPasswordResetMail = async () => { called++; };

    const req = { body: { email: 'User@Example.com' } };
    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; }
    };

    await controller.requestPasswordReset(req, res);
    const user1 = await db.user.findOne({ where: { email: 'user@example.com' } });
    const token1 = user1.resetToken;

    await controller.requestPasswordReset(req, res);
    const user2 = await db.user.findOne({ where: { email: 'user@example.com' } });
    const token2 = user2.resetToken;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(called, 2, 'Mail not sent for mixed-case email');
    assert.ok(token1, 'Token not set after first request');
    assert.ok(token2, 'Token not set after second request');
    assert.notStrictEqual(token1, token2, 'Token not refreshed on second request');

    console.log('password-reset.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
