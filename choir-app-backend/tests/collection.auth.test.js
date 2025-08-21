const assert = require('assert');
const express = require('express');
const http = require('http');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
let currentContext = {};
const authJwt = require('../src/middleware/auth.middleware');
authJwt.verifyToken = (req, res, next) => { Object.assign(req, currentContext); next(); };
const router = require('../src/routes/collection.routes');

(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/collections', router);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  async function send(method, url, body, context) {
    currentContext = context;
    const res = await fetch(`http://localhost:${port}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  }

  try {
    await db.sequelize.sync({ force: true });
    const choir = await db.choir.create({ name: 'Test Choir' });
    const collection = await db.collection.create({ title: 'Coll' });
    const choirAdmin = await db.user.create({ email: 'admin@example.com', roles: ['singer'] });
    await db.user_choir.create({ userId: choirAdmin.id, choirId: choir.id, rolesInChoir: ['choir_admin'] });
    const singer = await db.user.create({ email: 'singer@example.com', roles: ['singer'] });
    await db.user_choir.create({ userId: singer.id, choirId: choir.id, rolesInChoir: [] });

    let res = await send('PUT', `/api/collections/${collection.id}`, { title: 'Updated' }, {
      userRoles: ['singer'],
      userId: choirAdmin.id,
      activeChoirId: choir.id
    });
    assert.strictEqual(res.status, 200, 'choir admin should update');

    res = await send('PUT', `/api/collections/${collection.id}`, { title: 'Again' }, {
      userRoles: ['singer'],
      userId: singer.id,
      activeChoirId: choir.id
    });
    assert.strictEqual(res.status, 403, 'singer should be forbidden');

    await new Promise(resolve => server.close(resolve));
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await new Promise(resolve => server.close(resolve));
    await db.sequelize.close();
    process.exit(1);
  }
})();
