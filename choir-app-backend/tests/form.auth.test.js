const assert = require('assert');
const express = require('express');
const http = require('http');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const db = require('../src/models');
const { createUserWithRoles } = require('./utils/userFactory');

let currentContext = {};
const authJwt = require('../src/middleware/auth.middleware');
authJwt.verifyToken = (req, res, next) => {
  Object.assign(req, currentContext);
  next();
};

const router = require('../src/routes/form.routes');

(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/forms', router);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  async function send(method, url, body, context) {
    currentContext = context;
    const response = await fetch(`http://localhost:${port}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { status: response.status, data };
  }

  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Form Auth Choir' });

    const choirAdmin = await createUserWithRoles(db, {
      email: 'choir-admin@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['choir_admin'] }],
    });

    const director = await createUserWithRoles(db, {
      email: 'director@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['director'] }],
    });

    const createPayload = {
      title: 'Datenschutz-Formular',
      description: 'Nur Admin/Choradmin darf verwalten',
      status: 'draft',
      fields: [],
    };

    const directorCreate = await send('POST', '/api/forms', createPayload, {
      userRoles: ['user'],
      userId: director.id,
      activeChoirId: choir.id,
    });
    assert.strictEqual(directorCreate.status, 403, 'director must not create forms');

    const choirAdminCreate = await send('POST', '/api/forms', createPayload, {
      userRoles: ['user'],
      userId: choirAdmin.id,
      activeChoirId: choir.id,
    });
    assert.strictEqual(choirAdminCreate.status, 201, 'choir admin should create forms');
    assert.ok(choirAdminCreate.data?.id, 'created form should return id');

    const formId = choirAdminCreate.data.id;

    const directorResults = await send('GET', `/api/forms/${formId}/submissions`, null, {
      userRoles: ['user'],
      userId: director.id,
      activeChoirId: choir.id,
    });
    assert.strictEqual(directorResults.status, 403, 'director must not access form submissions');

    const choirAdminResults = await send('GET', `/api/forms/${formId}/submissions`, null, {
      userRoles: ['user'],
      userId: choirAdmin.id,
      activeChoirId: choir.id,
    });
    assert.strictEqual(choirAdminResults.status, 200, 'choir admin should access form submissions');

    await new Promise(resolve => server.close(resolve));
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await new Promise(resolve => server.close(resolve));
    await db.sequelize.close();
    process.exit(1);
  }
})();
