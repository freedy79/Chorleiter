const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const logger = require('../config/logger');
const data = require('../services/mcp/mcpData.service');
const write = require('../services/mcp/mcpWrite.service');

const SERVER_NAME = 'nak-chorleiter';
const SERVER_VERSION = require('../../package.json').version || '1.0.0';

function ok(payload) {
    // Stored free text is user content, not instructions - flag it for the calling model.
    const body = { untrusted_content: true, data: payload };
    return { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }] };
}

function fail(message, details) {
    const body = { error: message, ...(details ? { details } : {}) };
    return { isError: true, content: [{ type: 'text', text: JSON.stringify(body, null, 2) }] };
}

/**
 * Builds an MCP server instance bound to exactly one choir.
 *
 * The choirId comes from the API token and is captured in the closure, so no
 * tool argument can ever move the request into another tenant.
 */
function createMcpServer(context) {
    const { choirId, scopes = [], allowWrite = false, apiTokenId } = context;
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

    const has = (scope) => scopes.includes(scope);

    const guard = (scope, handler) => async (args) => {
        if (scope && !has(scope)) {
            return fail(`This API token is missing the required scope "${scope}".`);
        }
        try {
            return await handler(args || {});
        } catch (err) {
            logger.warn(`[MCP] Tool error for token ${apiTokenId}: ${err.message}`);
            return fail(err.message, err.details);
        }
    };

    const eventType = z.enum(['REHEARSAL', 'SERVICE']);

    server.registerTool('get_choir_info', {
        title: 'Chorinformationen',
        description: 'Basisdaten des Chors: Name, Ort, aktive Module und Kennzahlen zum Repertoire.',
        inputSchema: {},
    }, guard(null, async () => ok(await data.getChoirInfo(choirId))));

    server.registerTool('list_upcoming_events', {
        title: 'Nächste Termine',
        description: 'Kommende Proben und Gottesdienste mit Leitung, Organist und Stückliste.',
        inputSchema: {
            from: z.string().optional().describe('ISO-Datum, ab wann gesucht wird (Standard: heute)'),
            to: z.string().optional().describe('ISO-Datum, bis wann gesucht wird'),
            type: eventType.optional(),
            limit: z.number().int().min(1).max(50).optional(),
        },
    }, guard('events:read', async (args) => ok(await data.listUpcomingEvents(choirId, args))));

    server.registerTool('get_event', {
        title: 'Termin abrufen',
        description: 'Einzelner Termin des Chors inklusive aller Stücke.',
        inputSchema: { eventId: z.number().int().describe('Numerische Event-ID') },
    }, guard('events:read', async ({ eventId }) => {
        const event = await data.getEvent(choirId, eventId);
        return event ? ok(event) : fail('Event not found for this choir.');
    }));

    server.registerTool('get_last_event', {
        title: 'Letzte Probe oder letzter Gottesdienst',
        description: 'Was war in der letzten Probe bzw. im letzten Gottesdienst? Liefert Datum, Notizen, Leitung und die komplette Stückliste.',
        inputSchema: {
            type: eventType.default('REHEARSAL'),
            before: z.string().optional().describe('ISO-Datum; sucht den letzten Termin davor'),
        },
    }, guard('events:read', async (args) => {
        const event = await data.getLastEvent(choirId, args);
        return event ? ok(event) : fail('No matching past event found.');
    }));

    server.registerTool('list_recent_events', {
        title: 'Rückblick auf die letzten Termine',
        description: 'Die zuletzt stattgefundenen Termine inklusive gesungener bzw. geprobter Stücke.',
        inputSchema: {
            type: eventType.optional(),
            limit: z.number().int().min(1).max(20).optional(),
        },
    }, guard('events:read', async (args) => ok(await data.listRecentEvents(choirId, args))));

    server.registerTool('list_repertoire', {
        title: 'Repertoire',
        description: 'Das verfügbare Repertoire des Chors mit Status, Bewertung und Aufführungsstatistik.',
        inputSchema: {
            status: z.enum(['CAN_BE_SUNG', 'IN_REHEARSAL', 'NOT_READY']).optional(),
            voicing: z.string().optional(),
            minRating: z.number().int().min(1).max(5).optional(),
            query: z.string().optional().describe('Titelfilter'),
            limit: z.number().int().min(1).max(50).optional(),
            offset: z.number().int().min(0).optional(),
        },
    }, guard('repertoire:read', async (args) => ok(await data.listRepertoire(choirId, args))));

    server.registerTool('search', {
        title: 'Suche',
        description: 'Sucht im Chorbestand nach Titel, Liedtext, Person (Komponist, Textdichter, Arrangeur), Sammlung oder Terminnotiz.',
        inputSchema: {
            query: z.string().min(2),
            scope: z.enum(['all', 'title', 'lyrics', 'person', 'collection', 'event']).optional(),
            limit: z.number().int().min(1).max(50).optional(),
        },
    }, guard('search:read', async (args) => ok(await data.search(choirId, args))));

    server.registerTool('fetch', {
        title: 'Details abrufen',
        description: 'Volldetails zu einem Suchtreffer. Erwartet eine ID im Format piece:123, event:45 oder collection:7.',
        inputSchema: { id: z.string().describe('z.B. piece:123') },
    }, guard('search:read', async ({ id }) => {
        const result = await data.fetchById(choirId, id);
        return result ? ok(result) : fail(`Nothing found for id "${id}" in this choir.`);
    }));

    server.registerTool('get_service_plan', {
        title: 'Dienstplan',
        description: 'Dienstplan eines Monats: Datum, Anlass, musikalische Leitung und Orgel. Verfügbarkeiten einzelner Mitglieder werden bewusst nicht ausgegeben.',
        inputSchema: {
            year: z.number().int().min(2000).max(2100),
            month: z.number().int().min(1).max(12),
        },
    }, guard('plan:read', async ({ year, month }) => {
        const plan = await data.getServicePlan(choirId, year, month);
        return plan ? ok(plan) : fail(`No duty plan exists for ${month}/${year}.`);
    }));

    server.registerTool('get_next_duties', {
        title: 'Kommende Dienste',
        description: 'Die nächsten Dienstplan-Einträge über Monatsgrenzen hinweg mit musikalischer Leitung und Orgel.',
        inputSchema: { limit: z.number().int().min(1).max(20).optional() },
    }, guard('plan:read', async (args) => ok(await data.getNextDuties(choirId, args))));

    server.registerTool('get_piece_history', {
        title: 'Historie eines Stücks',
        description: 'Wann wurde ein Stück zuletzt gesungen oder geprobt und wie oft insgesamt?',
        inputSchema: {
            pieceId: z.number().int().optional(),
            title: z.string().optional(),
        },
    }, guard('stats:read', async (args) => {
        const history = await data.getPieceHistory(choirId, args);
        return history ? ok(history) : fail('Piece not found in this choir repertoire.');
    }));

    server.registerTool('get_repertoire_stats', {
        title: 'Repertoire-Statistik',
        description: 'Häufigste Gottesdienst- und Probenstücke sowie seit langem nicht gesungene Stücke.',
        inputSchema: {
            from: z.string().optional(),
            to: z.string().optional(),
            limit: z.number().int().min(1).max(20).optional(),
        },
    }, guard('stats:read', async (args) => ok(await data.getRepertoireStats(choirId, args))));

    server.registerTool('suggest_pieces', {
        title: 'Vorschläge für die nächste Probe',
        description: 'Singbare Stücke, die am längsten nicht mehr an der Reihe waren.',
        inputSchema: {
            count: z.number().int().min(1).max(10).optional(),
            status: z.enum(['CAN_BE_SUNG', 'IN_REHEARSAL', 'NOT_READY']).optional(),
            notSungSinceMonths: z.number().int().min(1).max(120).optional(),
        },
    }, guard('stats:read', async (args) => ok(await data.suggestPieces(choirId, args))));

    if (allowWrite && has('events:write')) {
        server.registerTool('resolve_pieces', {
            title: 'Titel auf Stücke abbilden',
            description: 'Pflicht-Vorstufe zum Schreiben: bildet Titeltexte auf echte pieceIds aus dem Chorrepertoire ab. Nur diese IDs dürfen weiterverwendet werden.',
            inputSchema: { titles: z.array(z.string()).min(1).max(30) },
        }, guard('repertoire:read', async ({ titles }) => ok(await write.resolvePieces(choirId, titles))));

        server.registerTool('prepare_event_pieces', {
            title: 'Liederliste vorbereiten',
            description: 'Erzeugt eine Vorschau der geänderten Liederliste eines Termins. Ändert noch nichts und liefert einen confirmationToken.',
            inputSchema: {
                eventId: z.number().int().optional(),
                date: z.string().optional().describe('ISO-Datum, falls keine eventId bekannt ist'),
                type: eventType.optional(),
                pieceIds: z.array(z.number().int()).min(1).max(60),
                mode: z.enum(['replace', 'append']).optional(),
            },
        }, guard('events:write', async (args) => ok(await write.prepareEventPieces({ apiTokenId, choirId, ...args }))));

        server.registerTool('commit_event_pieces', {
            title: 'Liederliste speichern',
            description: 'Wendet eine zuvor mit prepare_event_pieces erzeugte Änderung genau einmal an.',
            inputSchema: { confirmationToken: z.string().min(10) },
        }, guard('events:write', async ({ confirmationToken }) => ok(await write.commitEventPieces({ apiTokenId, choirId, confirmationToken }))));
    }

    return server;
}

module.exports = { createMcpServer, SERVER_NAME, SERVER_VERSION };
