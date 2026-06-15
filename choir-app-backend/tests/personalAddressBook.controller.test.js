const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const controller = require('../src/controllers/personalAddressBook.controller');

function res() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(data) { this.data = data; },
    json(data) { this.data = data; }
  };
}

async function setup() {
  await db.sequelize.sync({ force: true });
  const choir = await db.choir.create({ name: 'Test Choir', modules: { dienstplan: true } });
  const otherChoir = await db.choir.create({ name: 'Other Choir', modules: { dienstplan: true } });
  const owner = await db.user.create({ name: 'Owner', firstName: 'Olivia', email: 'owner@example.com', password: 'x' });
  const otherUser = await db.user.create({ name: 'Other', firstName: 'Otto', email: 'other@example.com', password: 'x' });
  const platformUser = await db.user.create({ name: 'Member', firstName: 'Mia', email: 'member@example.com', password: 'x' });
  await db.user_choir.create({ userId: owner.id, choirId: choir.id, rolesInChoir: ['director'] });
  await db.user_choir.create({ userId: otherUser.id, choirId: choir.id, rolesInChoir: ['director'] });
  await db.user_choir.create({ userId: platformUser.id, choirId: choir.id, rolesInChoir: ['singer'] });
  await db.user_choir.create({ userId: owner.id, choirId: otherChoir.id, rolesInChoir: ['director'] });
  return { choir, otherChoir, owner, otherUser, platformUser };
}

(async () => {
  try {
    const { choir, otherChoir, owner, otherUser } = await setup();
    const baseReq = { userId: owner.id, activeChoirId: choir.id };

    let response = res();
    await controller.create({ ...baseReq, body: { name: 'Extern', firstName: 'Eva', email: ' EVA@example.COM ' } }, response);
    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(response.data.email, 'eva@example.com');
    const entryId = response.data.id;

    response = res();
    await controller.create({ ...baseReq, body: { email: 'eva@example.com' } }, response);
    assert.strictEqual(response.statusCode, 409);

    await db.personal_address_book_entry.create({
      userId: otherUser.id,
      choirId: choir.id,
      name: 'Hidden',
      email: 'hidden@example.com',
      normalizedEmail: 'hidden@example.com'
    });
    await db.personal_address_book_entry.create({
      userId: owner.id,
      choirId: otherChoir.id,
      name: 'Other Choir',
      email: 'other-choir@example.com',
      normalizedEmail: 'other-choir@example.com'
    });

    response = res();
    await controller.list(baseReq, response);
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.data.map(e => e.email), ['eva@example.com']);

    response = res();
    await controller.check({ ...baseReq, body: { emails: ['member@example.com', 'eva@example.com', 'new@example.com', 'invalid'] } }, response);
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.data.knownUserEmails, ['member@example.com']);
    assert.deepStrictEqual(response.data.knownPersonalEmails, ['eva@example.com']);
    assert.deepStrictEqual(response.data.newEmails, ['new@example.com']);
    assert.deepStrictEqual(response.data.invalidEmails, ['invalid']);

    response = res();
    await controller.update({ ...baseReq, params: { id: entryId }, body: { name: 'Extern', firstName: 'Erika', email: 'erika@example.com' } }, response);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.data.firstName, 'Erika');
    assert.strictEqual(response.data.email, 'erika@example.com');

    response = res();
    await controller.createBulk({ ...baseReq, body: { emails: ['bulk@example.com', 'erika@example.com'] } }, response);
    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(response.data.length, 2);

    response = res();
    await controller.remove({ ...baseReq, params: { id: entryId } }, response);
    assert.strictEqual(response.statusCode, 204);
    const removed = await db.personal_address_book_entry.findByPk(entryId);
    assert.strictEqual(removed, null);

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
