const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/post.controller');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const user1 = await db.user.create({ email: 'u1@example.com', roles: ['user'] });
    const user2 = await db.user.create({ email: 'u2@example.com', roles: ['user'] });
    const user3 = await db.user.create({ email: 'u3@example.com', roles: ['user'] });

    const now = new Date();
    const future = new Date(now.getTime() + 86400000);
    const past = new Date(now.getTime() - 86400000);

    // create posts directly to avoid email side effects
    const p1 = await db.post.create({ title: 'p1', text: 't1', choirId: choir.id, userId: user1.id, published: true });
    const p2 = await db.post.create({ title: 'p2', text: 't2', choirId: choir.id, userId: user2.id, expiresAt: future, published: true });
    const p3 = await db.post.create({ title: 'p3', text: 't3', choirId: choir.id, userId: user2.id, expiresAt: past, published: true });
    const p4 = await db.post.create({ title: 'p4', text: 't4', choirId: choir.id, userId: user1.id, expiresAt: past, published: true });
    const p5 = await db.post.create({ title: 'p5', text: 't5', choirId: choir.id, userId: user2.id, published: false });

    const res = { status(code) { this.statusCode = code; return this; }, send(data) { this.data = data; } };

    // user1 should see p1, p2, p4 (own expired)
    await controller.findAll({ activeChoirId: choir.id, userId: user1.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    const ids1 = res.data.map(p => p.id);
    assert.deepStrictEqual(ids1.sort(), [p1.id, p2.id, p4.id].sort());

    // user3 (no relation) should see p1 and p2 only
    await controller.findAll({ activeChoirId: choir.id, userId: user3.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    const ids3 = res.data.map(p => p.id).sort();
    assert.deepStrictEqual(ids3, [p1.id, p2.id].sort());

    // user2 should see p1, p2, p3, p5 (own draft)
    await controller.findAll({ activeChoirId: choir.id, userId: user2.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    const ids2 = res.data.map(p => p.id).sort();
    assert.deepStrictEqual(ids2, [p1.id, p2.id, p3.id, p5.id].sort());

    // latest for user3 should be p2
    await controller.findLatest({ activeChoirId: choir.id, userId: user3.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.id, p2.id);

    // latest for user1 should be p4 (own expired)
    await controller.findLatest({ activeChoirId: choir.id, userId: user1.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.id, p4.id);

    // latest for user2 should be p5 (own unpublished)
    await controller.findLatest({ activeChoirId: choir.id, userId: user2.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.id, p5.id);

    console.log('post.controller tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
