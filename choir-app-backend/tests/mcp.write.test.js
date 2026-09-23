const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';
process.env.MCP_PERSON_REF_SECRET = 'test-person-ref-secret';

const db = require('../src/models');
const { createMcpServer } = require('../src/mcp/server');
const writeService = require('../src/services/mcp/mcpWrite.service');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

const WRITE_SCOPES = ['events:read', 'repertoire:read', 'search:read', 'plan:read', 'stats:read', 'events:write'];

async function connect(context) {
  const server = createMcpServer(context);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return { isError: Boolean(result.isError), payload: JSON.parse(result.content?.[0]?.text || '{}') };
}

async function pieceIdsOfEvent(eventId) {
  const rows = await db.event_pieces.findAll({ where: { eventId }, attributes: ['pieceId'], raw: true });
  return rows.map(r => r.pieceId).sort((a, b) => a - b);
}

async function setup() {
  await db.sequelize.sync({ force: true });
  const choirA = await db.choir.create({ name: 'Chor A' });
  const choirB = await db.choir.create({ name: 'Chor B' });

  const pieceA1 = await db.piece.create({ title: 'Lobe den Herren' });
  const pieceA2 = await db.piece.create({ title: 'Wie schoen leuchtet der Morgenstern' });
  const pieceA3 = await db.piece.create({ title: 'Nun danket alle Gott' });
  const pieceB = await db.piece.create({ title: 'Fremdes Stueck' });

  for (const p of [pieceA1, pieceA2, pieceA3]) {
    await db.choir_repertoire.create({ choirId: choirA.id, pieceId: p.id, status: 'NOT_READY' });
  }
  await db.choir_repertoire.create({ choirId: choirB.id, pieceId: pieceB.id, status: 'CAN_BE_SUNG' });

  const rehearsal = await db.event.create({ choirId: choirA.id, date: new Date('2026-09-18T19:00:00Z'), type: 'REHEARSAL', version: 0 });
  const finalized = await db.event.create({ choirId: choirA.id, date: new Date('2026-09-11T19:00:00Z'), type: 'REHEARSAL', finalized: true, version: 0 });
  const foreignEvent = await db.event.create({ choirId: choirB.id, date: new Date('2026-09-18T19:00:00Z'), type: 'REHEARSAL', version: 0 });
  await db.event_pieces.create({ eventId: rehearsal.id, pieceId: pieceA1.id });

  return { choirA, choirB, pieceA1, pieceA2, pieceA3, pieceB, rehearsal, finalized, foreignEvent };
}

(async () => {
  try {
    const ctx = await setup();
    writeService.resetForTests();

    // --- a read-only token does not even see the write tools ---
    const readOnly = await connect({ apiTokenId: 10, choirId: ctx.choirA.id, scopes: WRITE_SCOPES, allowWrite: false });
    const readOnlyTools = (await readOnly.client.listTools()).tools.map(t => t.name);
    assert.ok(!readOnlyTools.includes('prepare_event_pieces'), 'allowWrite=false must hide write tools');
    assert.ok(!readOnlyTools.includes('commit_event_pieces'));
    await readOnly.client.close();
    await readOnly.server.close();

    const apiTokenId = 11;
    const { client, server } = await connect({ apiTokenId, choirId: ctx.choirA.id, scopes: WRITE_SCOPES, allowWrite: true });
    const tools = (await client.listTools()).tools.map(t => t.name);
    for (const expected of ['resolve_pieces', 'prepare_event_pieces', 'commit_event_pieces']) {
      assert.ok(tools.includes(expected), `tool ${expected} should be registered`);
    }

    // --- resolve_pieces only ever returns real repertoire ids ---
    let r = await callTool(client, 'resolve_pieces', { titles: ['Lobe den Herren', 'Nun danket alle Gott', 'Fremdes Stueck', 'Voellig erfundener Titel'] });
    assert.strictEqual(r.payload.data.resolved.length, 2);
    assert.deepStrictEqual(r.payload.data.resolved.map(p => p.title).sort(), ['Lobe den Herren', 'Nun danket alle Gott']);
    const unresolvedTitles = r.payload.data.unresolved.map(u => u.query);
    assert.ok(unresolvedTitles.includes('Fremdes Stueck'), 'foreign piece must not resolve');
    assert.ok(unresolvedTitles.includes('Voellig erfundener Titel'), 'invented title must not resolve');

    // --- prepare does not change anything ---
    const before = await pieceIdsOfEvent(ctx.rehearsal.id);
    r = await callTool(client, 'prepare_event_pieces', {
      eventId: ctx.rehearsal.id,
      pieceIds: [ctx.pieceA2.id, ctx.pieceA3.id],
      mode: 'replace',
    });
    assert.strictEqual(r.payload.data.applied, false);
    assert.deepStrictEqual(await pieceIdsOfEvent(ctx.rehearsal.id), before, 'prepare must be side-effect free');
    assert.strictEqual(r.payload.data.removed[0].title, 'Lobe den Herren', 'removed pieces must be visible in the diff');
    assert.strictEqual(r.payload.data.added.length, 2);
    const confirmationToken = r.payload.data.confirmationToken;
    assert.ok(confirmationToken);

    // --- a forged token is rejected ---
    let forged = await callTool(client, 'commit_event_pieces', { confirmationToken: 'not-a-real-token-value' });
    assert.strictEqual(forged.isError, true);

    // --- a token issued for another API token is rejected ---
    const other = await connect({ apiTokenId: 99, choirId: ctx.choirA.id, scopes: WRITE_SCOPES, allowWrite: true });
    const stolen = await callTool(other.client, 'commit_event_pieces', { confirmationToken });
    assert.strictEqual(stolen.isError, true, 'confirmation token must be bound to its API token');
    assert.ok(stolen.payload.error.includes('different API token'));
    await other.client.close();
    await other.server.close();

    // --- commit applies exactly once ---
    r = await callTool(client, 'commit_event_pieces', { confirmationToken });
    assert.strictEqual(r.payload.data.applied, true);
    assert.deepStrictEqual(await pieceIdsOfEvent(ctx.rehearsal.id), [ctx.pieceA2.id, ctx.pieceA3.id].sort((a, b) => a - b));

    const replay = await callTool(client, 'commit_event_pieces', { confirmationToken });
    assert.strictEqual(replay.isError, true, 'confirmation token must be single use');

    // --- repertoire status follows the event type ---
    const status = await db.choir_repertoire.findOne({ where: { choirId: ctx.choirA.id, pieceId: ctx.pieceA2.id } });
    assert.strictEqual(status.status, 'IN_REHEARSAL');

    // --- append keeps the existing pieces ---
    r = await callTool(client, 'prepare_event_pieces', { eventId: ctx.rehearsal.id, pieceIds: [ctx.pieceA1.id], mode: 'append' });
    assert.strictEqual(r.payload.data.removed.length, 0);
    r = await callTool(client, 'commit_event_pieces', { confirmationToken: r.payload.data.confirmationToken });
    assert.strictEqual((await pieceIdsOfEvent(ctx.rehearsal.id)).length, 3);

    // --- foreign pieces are rejected ---
    r = await callTool(client, 'prepare_event_pieces', { eventId: ctx.rehearsal.id, pieceIds: [ctx.pieceB.id] });
    assert.strictEqual(r.isError, true);
    assert.ok(r.payload.error.includes('repertoire'));

    // --- foreign events are rejected ---
    r = await callTool(client, 'prepare_event_pieces', { eventId: ctx.foreignEvent.id, pieceIds: [ctx.pieceA1.id] });
    assert.strictEqual(r.isError, true, 'cross-tenant event must not be writable');

    // --- finalized events are rejected ---
    r = await callTool(client, 'prepare_event_pieces', { eventId: ctx.finalized.id, pieceIds: [ctx.pieceA1.id] });
    assert.strictEqual(r.isError, true);
    assert.ok(r.payload.error.includes('finalized'));

    // --- concurrent change is detected instead of overwritten ---
    r = await callTool(client, 'prepare_event_pieces', { eventId: ctx.rehearsal.id, pieceIds: [ctx.pieceA1.id], mode: 'replace' });
    const staleToken = r.payload.data.confirmationToken;
    const event = await db.event.findByPk(ctx.rehearsal.id);
    await event.update({ version: (event.version ?? 0) + 1 });
    const conflict = await callTool(client, 'commit_event_pieces', { confirmationToken: staleToken });
    assert.strictEqual(conflict.isError, true);
    assert.ok(conflict.payload.error.includes('changed in the meantime'));

    // --- resolving by date works and ambiguity is reported ---
    r = await callTool(client, 'prepare_event_pieces', { date: '2026-09-18', type: 'REHEARSAL', pieceIds: [ctx.pieceA1.id] });
    assert.strictEqual(r.isError, false, 'date based lookup should find the single rehearsal');

    r = await callTool(client, 'prepare_event_pieces', { date: '2030-01-01', pieceIds: [ctx.pieceA1.id] });
    assert.strictEqual(r.isError, true, 'missing event must not be created implicitly');

    await client.close();
    await server.close();

    console.log('mcp.write tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
