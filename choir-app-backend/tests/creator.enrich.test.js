const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const composerController = require('../src/controllers/composer.controller');

let calls = 0;
global.fetch = async () => {
  calls += 1;
  if (calls === 1) {
    return {
      status: 429,
      ok: false,
      headers: { get: () => '0' },
      json: async () => ({})
    };
  }
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: async () => ({
      artists: [{ 'life-span': { begin: '1800-01-01', end: '1850-01-01' } }]
    })
  };
};

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    const composer = await db.composer.create({ name: 'Test Person' });

    const req = { params: { id: composer.id } };
    let status;
    const res = {
      status(code) { status = code; return this; },
      send(data) { this.data = data; if (!status) status = 200; }
    };

    await composerController.enrich(req, res);
    assert.strictEqual(status, 200);
    const updated = await db.composer.findByPk(composer.id);
    assert.strictEqual(updated.birthYear, '1800');
    assert.strictEqual(calls, 2, 'should retry once');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
