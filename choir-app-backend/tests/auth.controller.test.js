const assert = require('assert');
const bcrypt = require('bcryptjs');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'secret';

const db = require('../src/models');
const controller = require('../src/controllers/auth.controller');
const emailService = require('../src/services/email.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({ name: 'User', email: 'u@example.com', password: bcrypt.hashSync('pass', 8) });
    await user.addChoir(choir);

    let mailSent = false;
    emailService.sendPasswordResetMail = async () => { mailSent = true; };

    const makeReqRes = (password) => {
      const req = { body: { email: 'u@example.com', password }, ip: '127.0.0.1', get: () => '' };
      const res = {
        status(code) { this.statusCode = code; return this; },
        send(data) { this.data = data; }
      };
      return { req, res };
    };

    // first wrong
    let { req, res } = makeReqRes('wrong');
    await controller.signin(req, res);
    assert.strictEqual(res.statusCode, 401);

    // second wrong
    ({ req, res } = makeReqRes('wrong'));
    await controller.signin(req, res);
    assert.strictEqual(res.statusCode, 401);

    // third wrong -> lock
    ({ req, res } = makeReqRes('wrong'));
    await controller.signin(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(mailSent, true);
    assert.strictEqual(res.data.resetMailSent, true);

    // correct password after lock -> still blocked
    ({ req, res } = makeReqRes('pass'));
    await controller.signin(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.resetMailSent, true);

    const attempts = await db.login_attempt.count({ where: { email: 'u@example.com' } });
    assert.strictEqual(attempts, 4);

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();

