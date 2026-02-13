const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.VAPID_PUBLIC_KEY = 'test-public';
process.env.VAPID_PRIVATE_KEY = 'test-private';
process.env.VAPID_SUBJECT = 'mailto:test@example.com';

const mockWebPush = {
  setVapidDetails: () => {},
  sendNotification: async () => {}
};

require.cache[require.resolve('web-push')] = { exports: mockWebPush };

const db = require('../src/models');
const { createUserWithRoles } = require('./utils/userFactory');
const pushService = require('../src/services/pushNotification.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Testchor' });
    const user1 = await createUserWithRoles(db, {
      email: 'alice@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['singer'] }]
    });
    const user2 = await createUserWithRoles(db, {
      email: 'bob@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['singer'] }]
    });

    const sub1 = await db.push_subscription.create({
      userId: user1.id,
      choirId: choir.id,
      endpoint: 'https://example.com/sub1',
      keys: { p256dh: 'key1', auth: 'auth1' }
    });
    await db.push_subscription.create({
      userId: user2.id,
      choirId: choir.id,
      endpoint: 'https://example.com/sub2',
      keys: { p256dh: 'key2', auth: 'auth2' }
    });

    const calls = [];
    mockWebPush.sendNotification = async (subscription, payload) => {
      calls.push({ subscription, payload });
    };

    await pushService.sendToChoirMembers(choir.id, { title: 'Hallo' }, user1.id);
    assert.strictEqual(calls.length, 1, 'Should notify only non-excluded members');
    assert.ok(calls[0].subscription.endpoint.includes('sub2'), 'Wrong subscription target');

    await pushService.removeInvalidSubscription(sub1.id);
    const removed = await db.push_subscription.findByPk(sub1.id);
    assert.strictEqual(removed, null, 'Subscription should be removed');

    const invalid = await db.push_subscription.create({
      userId: user1.id,
      choirId: choir.id,
      endpoint: 'https://example.com/invalid',
      keys: { p256dh: 'key3', auth: 'auth3' }
    });

    const goneError = new Error('Gone');
    goneError.statusCode = 410;
    mockWebPush.sendNotification = async () => { throw goneError; };

    await pushService.sendToChoirMembers(choir.id, { title: 'Test' });
    const invalidAfter = await db.push_subscription.findByPk(invalid.id);
    assert.strictEqual(invalidAfter, null, 'Invalid subscription should be removed after 410');

    console.log('notification.service tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
