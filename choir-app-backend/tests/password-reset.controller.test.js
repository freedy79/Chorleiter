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

    let called = false;
    emailService.sendPasswordResetMail = async () => { called = true; };

    const req = { body: { email: 'User@Example.com' } };
    const res = {
      status(code) { this.statusCode = code; return this; },
      send(data) { this.data = data; }
    };
    await controller.requestPasswordReset(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(called, true, 'Mail not sent for mixed-case email');

    console.log('password-reset.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
