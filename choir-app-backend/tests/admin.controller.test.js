const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/admin.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const user = await db.user.create({ email: 'test@example.com', roles: ['director'] });

    let res = { status(code){ this.statusCode = code; return this; }, send(data){ this.data = data; } };
    await controller.updateUser({ params: { id: user.id }, body: { voice: '' } }, res);
    assert.strictEqual(res.statusCode, 200, 'status 200 when clearing voice');
    const refreshed = await db.user.findByPk(user.id);
    assert.strictEqual(refreshed.voice, null, 'voice cleared to null');

    res = { status(code){ this.statusCode = code; return this; }, send(data){ this.data = data; } };
    await controller.updateUser({ params: { id: user.id }, body: { voice: 'Unknown' } }, res);
    assert.strictEqual(res.statusCode, 400, 'status 400 on invalid voice');
    assert.strictEqual(res.data.message, 'Invalid voice value.');

    const resetUser = await db.user.create({ email: 'reset@example.com', roles: ['director'], resetToken: 'abc', resetTokenExpiry: new Date() });
    res = { status(code){ this.statusCode = code; return this; }, send(data){ this.data = data; } };
    await controller.clearResetToken({ params: { id: resetUser.id } }, res);
    assert.strictEqual(res.statusCode, 200, 'status 200 on clear reset token');
    const cleared = await db.user.findByPk(resetUser.id);
    assert.strictEqual(cleared.resetToken, null, 'resetToken cleared');
    assert.strictEqual(cleared.resetTokenExpiry, null, 'resetTokenExpiry cleared');

    console.log('admin.controller.updateUser voice tests passed');
    console.log('admin.controller.clearResetToken tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
