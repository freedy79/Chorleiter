const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';
process.env.MCP_PERSON_REF_SECRET = 'test-person-ref-secret';

const db = require('../src/models');
const { createMcpServer } = require('../src/mcp/server');
const { DENIED_FIELDS } = require('../src/services/mcp/mcpSerializers');
const writeService = require('../src/services/mcp/mcpWrite.service');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

const READ_SCOPES = ['events:read', 'repertoire:read', 'search:read', 'plan:read', 'stats:read'];

async function connect(context) {
  const server = createMcpServer(context);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.[0]?.text || '{}';
  return { isError: Boolean(result.isError), payload: JSON.parse(text) };
}

/** Recursively fails if a response contains a denied field name or an email address. */
function assertNoPii(value, path = 'root') {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(value), `email address leaked at ${path}: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoPii(item, `${path}[${i}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!DENIED_FIELDS.includes(key), `denied field "${key}" leaked at ${path}`);
      assertNoPii(child, `${path}.${key}`);
    }
  }
}

async function setup() {
  await db.sequelize.sync({ force: true });

  const choirA = await db.choir.create({
    name: 'Chor A',
    location: 'Musterstadt',
    // dashboardContactUserIds is real config that must not reach the client.
    modules: { dienstplan: true, programs: false, singerMenu: { events: true, repertoire: false }, dashboardContactUserIds: [2, 1] },
  });
  const choirB = await db.choir.create({ name: 'Chor B', location: 'Anderswo' });

  const director = await db.user.create({ name: 'Leiter', firstName: 'Dora', email: 'dora@example.com', password: 'x', phone: '0123456789' });
  const organist = await db.user.create({ name: 'Orgel', firstName: 'Olaf', email: 'olaf@example.com', password: 'x' });
  await db.user_choir.create({ userId: director.id, choirId: choirA.id, rolesInChoir: ['director'] });
  await db.user_choir.create({ userId: organist.id, choirId: choirA.id, rolesInChoir: ['organist'] });

  const composer = await db.composer.create({ name: 'Johann Sebastian Bach' });
  const author = await db.author.create({ name: 'Paul Gerhardt' });

  const pieceSung = await db.piece.create({ title: 'Lobe den Herren', composerId: composer.id, authorId: author.id, voicing: 'SATB', lyrics: 'Lobe den Herren, den maechtigen Koenig der Ehren' });
  const pieceStale = await db.piece.create({ title: 'Wie schoen leuchtet der Morgenstern', composerId: composer.id, voicing: 'SAB' });
  const pieceSecret = await db.piece.create({ title: 'Geheimstueck von Chor B', composerId: composer.id });

  await db.choir_repertoire.create({ choirId: choirA.id, pieceId: pieceSung.id, status: 'CAN_BE_SUNG', rating: 5, notes: 'Publikumsliebling' });
  await db.choir_repertoire.create({ choirId: choirA.id, pieceId: pieceStale.id, status: 'CAN_BE_SUNG', rating: 3 });
  await db.choir_repertoire.create({ choirId: choirB.id, pieceId: pieceSecret.id, status: 'CAN_BE_SUNG' });

  const collection = await db.collection.create({ title: 'Chorbuch 1', prefix: 'CB' });
  await db.collection_piece.create({ pieceId: pieceSung.id, collectionId: collection.id, numberInCollection: '12' });

  const lastService = await db.event.create({ choirId: choirA.id, date: new Date('2026-09-06T10:00:00Z'), type: 'SERVICE', notes: 'Erntedank', directorId: director.id, organistId: organist.id });
  const lastRehearsal = await db.event.create({ choirId: choirA.id, date: new Date('2026-09-18T19:00:00Z'), type: 'REHEARSAL', notes: 'Probe vor Erntedank', directorId: director.id });
  const upcoming = await db.event.create({ choirId: choirA.id, date: new Date('2026-12-24T16:00:00Z'), type: 'SERVICE', notes: 'Heiligabend', directorId: director.id });
  await db.event.create({ choirId: choirB.id, date: new Date('2026-12-25T10:00:00Z'), type: 'SERVICE', notes: 'Fremder Gottesdienst' });

  await db.event_pieces.create({ eventId: lastService.id, pieceId: pieceSung.id });
  await db.event_pieces.create({ eventId: lastRehearsal.id, pieceId: pieceSung.id });

  const plan = await db.monthly_plan.create({ choirId: choirA.id, year: 2026, month: 12 });
  await db.plan_entry.create({ monthlyPlanId: plan.id, date: new Date('2026-12-24T16:00:00Z'), eventType: 'SERVICE', notes: 'Christvesper', directorId: director.id, organistId: organist.id });

  // Availability data must never surface through MCP.
  await db.user_availability.create({ userId: director.id, choirId: choirA.id, date: '2026-12-24', status: 'UNAVAILABLE' });

  return { choirA, choirB, director, pieceSung, pieceStale, pieceSecret, lastService, lastRehearsal, upcoming };
}

(async () => {
  try {
    const ctx = await setup();
    writeService.resetForTests();

    const readContext = { apiTokenId: 1, choirId: ctx.choirA.id, scopes: READ_SCOPES, allowWrite: false };
    const { client, server } = await connect(readContext);

    const tools = (await client.listTools()).tools.map(t => t.name);
    for (const expected of ['get_choir_info', 'list_upcoming_events', 'get_last_event', 'list_recent_events', 'list_repertoire', 'search', 'fetch', 'get_service_plan', 'get_next_duties', 'get_piece_history', 'get_repertoire_stats', 'suggest_pieces']) {
      assert.ok(tools.includes(expected), `tool ${expected} should be registered`);
    }
    assert.ok(!tools.includes('commit_event_pieces'), 'read-only token must not expose write tools');

    // --- choir info ---
    let r = await callTool(client, 'get_choir_info');
    assert.strictEqual(r.payload.data.name, 'Chor A');
    assert.strictEqual(r.payload.data.repertoireCount, 2);
    assert.strictEqual(r.payload.untrusted_content, true);

    // modules must be reduced to feature flags - no user ids, no other config
    assert.deepStrictEqual(r.payload.data.modules, {
      dienstplan: true,
      programs: false,
      singerMenu: { events: true, repertoire: false },
    });
    assert.ok(!JSON.stringify(r.payload).includes('dashboardContactUserIds'), 'config keys with user ids must be stripped');

    // --- upcoming events ---
    r = await callTool(client, 'list_upcoming_events', { from: '2026-10-01', limit: 10 });
    assert.strictEqual(r.payload.data.length, 1);
    assert.strictEqual(r.payload.data[0].eventId, ctx.upcoming.eventId ?? ctx.upcoming.id);
    assert.strictEqual(r.payload.data[0].director.displayName, 'Dora Leiter');
    assert.ok(r.payload.data[0].director.ref, 'person should carry a pseudonymous ref');
    assert.ok(!('id' in r.payload.data[0].director) || typeof r.payload.data[0].director.id === 'undefined');

    // --- last rehearsal / last service ---
    r = await callTool(client, 'get_last_event', { type: 'REHEARSAL', before: '2026-09-23' });
    assert.strictEqual(r.payload.data.notes, 'Probe vor Erntedank');
    assert.strictEqual(r.payload.data.pieces.length, 1);
    assert.strictEqual(r.payload.data.pieces[0].title, 'Lobe den Herren');

    r = await callTool(client, 'get_last_event', { type: 'SERVICE', before: '2026-09-23' });
    assert.strictEqual(r.payload.data.notes, 'Erntedank');

    r = await callTool(client, 'list_recent_events', { limit: 5, });
    assert.ok(r.payload.data.length >= 1);

    // --- repertoire with statistics ---
    r = await callTool(client, 'list_repertoire', { limit: 50 });
    assert.strictEqual(r.payload.data.total, 2);
    const sung = r.payload.data.items.find(i => i.title === 'Lobe den Herren');
    assert.strictEqual(sung.timesSung, 1);
    assert.strictEqual(sung.timesRehearsed, 1);
    assert.strictEqual(sung.status, 'CAN_BE_SUNG');
    assert.strictEqual(sung.collections[0].reference, 'CB12');
    assert.ok(!r.payload.data.items.some(i => i.title.includes('Geheimstueck')), 'cross-tenant piece must not appear');

    // --- search variants ---
    r = await callTool(client, 'search', { query: 'Lobe', scope: 'title' });
    assert.strictEqual(r.payload.data.pieces.length, 1);

    r = await callTool(client, 'search', { query: 'maechtigen', scope: 'lyrics' });
    assert.strictEqual(r.payload.data.pieces.length, 1, 'lyrics search should find the piece');

    r = await callTool(client, 'search', { query: 'Bach', scope: 'person' });
    assert.strictEqual(r.payload.data.pieces.length, 2, 'composer search should find both choir pieces');

    r = await callTool(client, 'search', { query: 'Geheimstueck' });
    assert.strictEqual(r.payload.data.pieces.length, 0, 'search must stay inside the choir');

    // --- fetch ---
    r = await callTool(client, 'fetch', { id: `piece:${ctx.pieceSung.id}` });
    assert.strictEqual(r.payload.data.title, 'Lobe den Herren');
    assert.ok(r.payload.data.lyrics.includes('Lobe den Herren'));

    r = await callTool(client, 'fetch', { id: `piece:${ctx.pieceSecret.id}` });
    assert.strictEqual(r.isError, true, 'fetching a foreign piece must fail');

    // --- duty plan: names yes, availability no ---
    r = await callTool(client, 'get_service_plan', { year: 2026, month: 12 });
    assert.strictEqual(r.payload.data.entries.length, 1);
    assert.strictEqual(r.payload.data.entries[0].director.displayName, 'Dora Leiter');
    assert.strictEqual(r.payload.data.entries[0].organist.displayName, 'Olaf Orgel');
    assert.ok(!JSON.stringify(r.payload).includes('UNAVAILABLE'), 'availability must never be exposed');

    r = await callTool(client, 'get_next_duties', { limit: 5 });
    assert.ok(Array.isArray(r.payload.data));

    // --- statistics ---
    r = await callTool(client, 'get_piece_history', { title: 'Lobe den Herren' });
    assert.strictEqual(r.payload.data.timesSung, 1);
    assert.strictEqual(r.payload.data.performances.length, 2);

    r = await callTool(client, 'get_repertoire_stats', {});
    assert.strictEqual(r.payload.data.singableCount, 2);
    assert.strictEqual(r.payload.data.topServicePieces[0].title, 'Lobe den Herren');

    r = await callTool(client, 'suggest_pieces', { count: 5, notSungSinceMonths: 1 });
    assert.ok(r.payload.data.some(p => p.title.includes('Morgenstern')), 'never sung piece should be suggested');

    // --- PII scan across every read tool ---
    for (const name of ['get_choir_info', 'list_upcoming_events', 'list_recent_events', 'list_repertoire', 'get_service_plan', 'get_next_duties', 'get_repertoire_stats']) {
      const args = name === 'get_service_plan' ? { year: 2026, month: 12 } : {};
      const response = await callTool(client, name, args);
      assertNoPii(response.payload, name);
    }

    // --- scope enforcement ---
    const limited = await connect({ apiTokenId: 2, choirId: ctx.choirA.id, scopes: ['events:read'], allowWrite: false });
    const denied = await callTool(limited.client, 'list_repertoire', {});
    assert.strictEqual(denied.isError, true, 'missing scope must be rejected');
    assert.ok(denied.payload.error.includes('repertoire:read'));
    await limited.client.close();
    await limited.server.close();

    // --- tenant isolation: same tools, other choir ---
    const foreign = await connect({ apiTokenId: 3, choirId: ctx.choirB.id, scopes: READ_SCOPES, allowWrite: false });
    const foreignRepertoire = await callTool(foreign.client, 'list_repertoire', {});
    assert.strictEqual(foreignRepertoire.payload.data.total, 1);
    assert.strictEqual(foreignRepertoire.payload.data.items[0].title, 'Geheimstueck von Chor B');
    const foreignPlan = await callTool(foreign.client, 'get_service_plan', { year: 2026, month: 12 });
    assert.strictEqual(foreignPlan.isError, true, 'choir B has no plan and must not see choir A');
    await foreign.client.close();
    await foreign.server.close();

    await client.close();
    await server.close();

    console.log('mcp.tools tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
