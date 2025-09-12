const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/choir-management.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const adminUser = await db.user.create({ email: 'a@example.com', roles: ['admin'] });
    const member = await db.user.create({ email: 'u@example.com', roles: ['singer'] });
    await choir.addUser(member, { through: { rolesInChoir: ['director'] } });

    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.updateMyChoir({ activeChoirId: choir.id, userId: member.id, userRoles: ['singer'], body: { modules: { dienstplan: true } } }, res);
    assert.strictEqual(res.statusCode, 403, 'director should not change modules');

    const assoc = await db.user_choir.findOne({ where: { userId: member.id, choirId: choir.id } });
    await assoc.update({ rolesInChoir: ['choir_admin'] });
    await controller.updateMyChoir({ activeChoirId: choir.id, userId: member.id, userRoles: ['singer'], body: { modules: { dienstplan: true } } }, res);
    assert.strictEqual(res.statusCode, 200, 'choir_admin should change modules');

    await controller.updateMyChoir({ activeChoirId: choir.id, userId: adminUser.id, userRoles: ['admin'], body: { modules: { dienstplan: false } } }, res);
    assert.strictEqual(res.statusCode, 200, 'admin should change modules');

    const hidden = await db.user.create({ email: 'h@example.com', roles: ['singer'], firstName: 'H', name: 'Hidden', street: 's', postalCode: '1', city: 'c', shareWithChoir: false });
    const shared = await db.user.create({ email: 's@example.com', roles: ['singer'], firstName: 'S', name: 'Shared', street: 's', postalCode: '1', city: 'c', shareWithChoir: true });
    await choir.addUser(hidden, { through: { rolesInChoir: ['singer'], registrationStatus: 'REGISTERED' } });
    await choir.addUser(shared, { through: { rolesInChoir: ['singer'], registrationStatus: 'REGISTERED' } });

    await controller.getChoirMembers({ activeChoirId: choir.id, userRoles: ['singer'] }, res);
    assert.strictEqual(res.statusCode, 200, 'director should fetch members');
    const hiddenMember = res.data.find(m => m.email === 'h@example.com');
    const sharedMember = res.data.find(m => m.email === 's@example.com');
    assert.strictEqual(hiddenMember.street, undefined, 'hidden address should not be visible');
    assert.strictEqual(sharedMember.street, 's', 'shared address should be visible');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
