const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/choir-management.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const adminUser = await db.user.create({ email: 'a@example.com', role: 'admin' });
    const member = await db.user.create({ email: 'u@example.com', role: 'director' });
    await choir.addUser(member, { through: { rolesInChoir: ['director'] } });

    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.updateMyChoir({ activeChoirId: choir.id, userId: member.id, userRole: 'director', body: { modules: { dienstplan: true } } }, res);
    assert.strictEqual(res.statusCode, 403, 'director should not change modules');

    const assoc = await db.user_choir.findOne({ where: { userId: member.id, choirId: choir.id } });
    await assoc.update({ rolesInChoir: ['choir_admin'] });
    await controller.updateMyChoir({ activeChoirId: choir.id, userId: member.id, userRole: 'director', body: { modules: { dienstplan: true } } }, res);
    assert.strictEqual(res.statusCode, 200, 'choir_admin should change modules');

    await controller.updateMyChoir({ activeChoirId: choir.id, userId: adminUser.id, userRole: 'admin', body: { modules: { dienstplan: false } } }, res);
    assert.strictEqual(res.statusCode, 200, 'admin should change modules');

    console.log('choir-management controller permissions test passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
