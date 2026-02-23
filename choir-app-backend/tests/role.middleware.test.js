const assert = require('assert');
const express = require('express');
const http = require('http');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const { createUserWithRoles } = require('./utils/userFactory');
const { requireNonDemo, requireAdmin, requireChoirAdmin, requireDirector, requireDirectorOrHigher, requireChoirAdminOrNotenwart, requireLibrarian, requireNonSinger } = require('../src/middleware/role.middleware');

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
    const otherChoir = await db.choir.create({ name: 'Second Choir' });
    const admin = await createUserWithRoles(db, { email: 'a@example.com', globalRoles: ['admin'] });
    const choirAdmin = await createUserWithRoles(db, {
      email: 'c@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['choir_admin'] }]
    });
    const choirDirector = await createUserWithRoles(db, {
      email: 'd@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['choirleiter'] }]
    });
    const normal = await createUserWithRoles(db, { email: 'n@example.com' });
    const otherChoirAdmin = await createUserWithRoles(db, {
      email: 'oc@example.com',
      choirMemberships: [{ choirId: otherChoir.id, rolesInChoir: ['choir_admin'] }]
    });
    const choirNotenwart = await createUserWithRoles(db, {
      email: 'nw@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['notenwart'] }]
    });
    const choirOrganist = await createUserWithRoles(db, {
      email: 'org@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['organist'] }]
    });
    const choirSinger = await createUserWithRoles(db, {
      email: 'sing@example.com',
      choirMemberships: [{ choirId: choir.id, rolesInChoir: ['singer'] }]
    });
    await db.user_choir.findOrCreate({
      where: { userId: choirAdmin.id, choirId: choir.id },
      defaults: { rolesInChoir: ['choir_admin'] }
    });
    await db.user_choir.findOrCreate({
      where: { userId: choirDirector.id, choirId: choir.id },
      defaults: { rolesInChoir: ['director'] }
    });
    await db.user_choir.findOrCreate({
      where: { userId: otherChoirAdmin.id, choirId: otherChoir.id },
      defaults: { rolesInChoir: ['choir_admin'] }
    });
    await db.user_choir.findOrCreate({
      where: { userId: choirNotenwart.id, choirId: choir.id },
      defaults: { rolesInChoir: ['notenwart'] }
    });
    await db.user_choir.findOrCreate({
      where: { userId: choirOrganist.id, choirId: choir.id },
      defaults: { rolesInChoir: ['organist'] }
    });
    await db.user_choir.findOrCreate({
      where: { userId: choirSinger.id, choirId: choir.id },
      defaults: { rolesInChoir: ['singer'] }
    });

    // requireNonDemo success
    let res = await sendRequest(requireNonDemo, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'non demo should pass');

    // requireNonDemo failure
    res = await sendRequest(requireNonDemo, { userRoles: ['demo'] });
    assert.strictEqual(res.status, 403, 'demo should be blocked');

    // requireNonDemo failure with mixed roles
    res = await sendRequest(requireNonDemo, { userRoles: ['user', 'demo'] });
    assert.strictEqual(res.status, 403, 'demo role should block even with other roles');

    // requireNonDemo allows requests without explicit roles (e.g. optional auth)
    res = await sendRequest(requireNonDemo, {});
    assert.strictEqual(res.status, 200, 'missing roles should default to pass');

    // requireAdmin success
    res = await sendRequest(requireAdmin, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'admin should pass');

    // requireAdmin failure
    res = await sendRequest(requireAdmin, { userRoles: ['user'] });
    assert.strictEqual(res.status, 403, 'non-admin blocked');

    // requireChoirAdmin success as global admin
    res = await sendRequest(requireChoirAdmin, { userRoles: ['admin'], userId: admin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'global admin should pass');

    // requireChoirAdmin success as choir admin
    res = await sendRequest(requireChoirAdmin, { userRoles: ['user'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass');

    // requireChoirAdmin failure
    res = await sendRequest(requireChoirAdmin, { userRoles: ['user'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'non-admin should be blocked');

    // requireChoirAdmin failure for choir admin assigned to a different choir
    res = await sendRequest(requireChoirAdmin, { userRoles: ['user'], userId: otherChoirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'foreign choir admin should be blocked');

    // requireChoirAdmin db error
    const originalFindOne = db.user_choir.findOne;
    db.user_choir.findOne = async () => { throw new Error('fail'); };
    res = await sendRequest(requireChoirAdmin, { userRoles: ['user'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 500, 'db error should return 500');
    db.user_choir.findOne = originalFindOne;

    // requireDirector success as global admin
    res = await sendRequest(requireDirector, { userRoles: ['admin'], userId: admin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'global admin should pass director middleware');

    // requireDirector failure as global librarian (librarian no longer grants director access)
    res = await sendRequest(requireDirector, { userRoles: ['librarian'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'librarian should NOT pass director middleware');

    // requireDirector success as choir admin via association
    res = await sendRequest(requireDirector, { userRoles: ['user'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass director middleware');

    // requireDirector success as choir director via association
    res = await sendRequest(requireDirector, { userRoles: ['user'], userId: choirDirector.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir director should pass director middleware');

    // requireDirector failure for choir admin of another choir
    res = await sendRequest(requireDirector, { userRoles: ['user'], userId: otherChoirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'foreign choir admin should be blocked by director middleware');

    // requireDirector failure for regular user
    res = await sendRequest(requireDirector, { userRoles: ['user'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'non-director should be blocked by director middleware');

    // requireDirectorOrHigher success as global admin
    res = await sendRequest(requireDirectorOrHigher, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'admin should pass');

    // requireDirectorOrHigher success as choir admin via association
    res = await sendRequest(requireDirectorOrHigher, { userRoles: ['user'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass');

    // requireDirectorOrHigher success as choir director via association
    res = await sendRequest(requireDirectorOrHigher, { userRoles: ['user'], userId: choirDirector.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir director should pass');

    // requireDirectorOrHigher failure
    res = await sendRequest(requireDirectorOrHigher, { userRoles: ['user'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'non-director should be blocked');

    // --- requireChoirAdminOrNotenwart tests ---
    // success as global admin
    res = await sendRequest(requireChoirAdminOrNotenwart, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'admin should pass choirAdminOrNotenwart');

    // success as global librarian
    res = await sendRequest(requireChoirAdminOrNotenwart, { userRoles: ['librarian'] });
    assert.strictEqual(res.status, 200, 'librarian should pass choirAdminOrNotenwart');

    // success as choir admin
    res = await sendRequest(requireChoirAdminOrNotenwart, { userRoles: ['user'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass choirAdminOrNotenwart');

    // success as notenwart
    res = await sendRequest(requireChoirAdminOrNotenwart, { userRoles: ['user'], userId: choirNotenwart.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'notenwart should pass choirAdminOrNotenwart');

    // failure as singer
    res = await sendRequest(requireChoirAdminOrNotenwart, { userRoles: ['user'], userId: choirSinger.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'singer should be blocked by choirAdminOrNotenwart');

    // failure as regular user without choir membership
    res = await sendRequest(requireChoirAdminOrNotenwart, { userRoles: ['user'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'non-member should be blocked by choirAdminOrNotenwart');

    // --- requireLibrarian tests (now includes choir-level notenwart) ---
    // success as global librarian
    res = await sendRequest(requireLibrarian, { userRoles: ['librarian'] });
    assert.strictEqual(res.status, 200, 'global librarian should pass requireLibrarian');

    // success as global admin
    res = await sendRequest(requireLibrarian, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'global admin should pass requireLibrarian');

    // success as choir notenwart
    res = await sendRequest(requireLibrarian, { userRoles: ['user'], userId: choirNotenwart.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'notenwart should pass requireLibrarian');

    // success as choir admin
    res = await sendRequest(requireLibrarian, { userRoles: ['user'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass requireLibrarian');

    // failure as singer
    res = await sendRequest(requireLibrarian, { userRoles: ['user'], userId: choirSinger.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'singer should be blocked by requireLibrarian');

    // --- requireNonSinger tests ---
    // success as global admin
    res = await sendRequest(requireNonSinger, { userRoles: ['admin'] });
    assert.strictEqual(res.status, 200, 'admin should pass requireNonSinger');

    // success as global librarian
    res = await sendRequest(requireNonSinger, { userRoles: ['librarian'] });
    assert.strictEqual(res.status, 200, 'librarian should pass requireNonSinger');

    // success as choir director
    res = await sendRequest(requireNonSinger, { userRoles: ['user'], userId: choirDirector.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'director should pass requireNonSinger');

    // success as choir admin
    res = await sendRequest(requireNonSinger, { userRoles: ['user'], userId: choirAdmin.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'choir admin should pass requireNonSinger');

    // success as notenwart
    res = await sendRequest(requireNonSinger, { userRoles: ['user'], userId: choirNotenwart.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'notenwart should pass requireNonSinger');

    // success as organist
    res = await sendRequest(requireNonSinger, { userRoles: ['user'], userId: choirOrganist.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 200, 'organist should pass requireNonSinger');

    // failure as singer
    res = await sendRequest(requireNonSinger, { userRoles: ['user'], userId: choirSinger.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'singer should be blocked by requireNonSinger');

    // failure as non-member
    res = await sendRequest(requireNonSinger, { userRoles: ['user'], userId: normal.id, activeChoirId: choir.id });
    assert.strictEqual(res.status, 403, 'non-member should be blocked by requireNonSinger');

    console.log('All role middleware tests passed!');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
