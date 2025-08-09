const assert = require('assert');
const express = require('express');
const http = require('http');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const { requireNonDemo, requireAdmin, requireChoirAdmin } = require('../src/middleware/role.middleware');

async function sendRequest(middleware, context) {
  const app = express();
  app.use((req, res, next) => { Object.assign(req, context); next(); });
  app.get('/', middleware, (req, res) => res.status(200).send({ ok: true }));
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/`);
  const text = await res.text();
  server.close();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    // Create test data for choir admin checks
    const choir = await db.choir.create({ name: 'Test Choir' });
    const admin = await db.user.create({ email: 'a@example.com', roles: ['admin'] });
    const choirAdmin = await db.user.create({ email: 'c@example.com', roles: ['singer'] });
    const normal = await db.user.create({ email: 'n@example.com', roles: ['singer'] });
    await db.user_choir.create({ userId: choirAdmin.id, choirId: choir.id, rolesInChoir: ['choir_admin'] });

    // requireNonDemo success
    let res = await sendRequest(requireNonDemo, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'non demo should pass');

    // requireNonDemo failure
    res = await sendRequest(requireNonDemo, { userRoles: ['demo'] });
    assert.strictEqual(res.status, 403, 'demo should be blocked');

    // requireAdmin success
    res = await sendRequest(requireAdmin, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'admin should pass');

    // requireAdmin failure
    res = await sendRequest(requireAdmin, { userRoles: ['singer'] });
    assert.strictEqual(res.status, 403, 'non-admin blocked');

    // requireChoirAdmin success as global admin
    res = await sendRequest(requireChoirAdmin, { userRoles: ['admin'], userId: admin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'global admin should pass');

    // requireChoirAdmin success as choir admin
    res = await sendRequest(requireChoirAdmin, { userRoles: ['singer'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass');

    // requireChoirAdmin failure
    res = await sendRequest(requireChoirAdmin, { userRoles: ['singer'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'non-admin should be blocked');

    // requireChoirAdmin db error
    const originalFindOne = db.user_choir.findOne;
    db.user_choir.findOne = async () => { throw new Error('fail'); };
    res = await sendRequest(requireChoirAdmin, { userRoles: ['singer'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 500, 'db error should return 500');
    db.user_choir.findOne = originalFindOne;

    console.log('role.middleware tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
