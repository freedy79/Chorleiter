const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const { createUserWithRoles } = require('./utils/userFactory');
const controller = require('../src/controllers/choir-management.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const adminUser = await createUserWithRoles(db, { email: 'a@example.com', globalRoles: ['admin'] });
    const member = await createUserWithRoles(db, {
      email: 'u@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['choirleiter'] }]
    });
    await choir.addUser(member, { through: { rolesInChoir: ['director'] } });

    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    await controller.updateMyChoir({ activeChoirId: choir.id, userId: member.id, userRoles: ['user'], body: { modules: { dienstplan: true } } }, res);
    assert.strictEqual(res.statusCode, 403, 'director should not change modules');

    const assoc = await db.user_choir.findOne({ where: { userId: member.id, choirId: choir.id } });
    await assoc.update({ rolesInChoir: ['choir_admin'] });
    await controller.updateMyChoir({ activeChoirId: choir.id, userId: member.id, userRoles: ['user'], body: { modules: { dienstplan: true } } }, res);
    assert.strictEqual(res.statusCode, 200, 'choir_admin should change modules');

    await controller.updateMyChoir({ activeChoirId: choir.id, userId: adminUser.id, userRoles: ['admin'], body: { modules: { dienstplan: false } } }, res);
    assert.strictEqual(res.statusCode, 200, 'admin should change modules');

    const hidden = await createUserWithRoles(db, {
      email: 'h@example.com',
      firstName: 'H',
      name: 'Hidden',
      street: 's',
      postalCode: '1',
      city: 'c',
      shareWithChoir: false,
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['singer'], registrationStatus: 'REGISTERED' }]
    });
    const shared = await createUserWithRoles(db, {
      email: 's@example.com',
      firstName: 'S',
      name: 'Shared',
      street: 's',
      postalCode: '1',
      city: 'c',
      shareWithChoir: true,
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['singer'], registrationStatus: 'REGISTERED' }]
    });

    await controller.getChoirMembers({ activeChoirId: choir.id, userRoles: ['user'] }, res);
    assert.strictEqual(res.statusCode, 200, 'should fetch members');
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
