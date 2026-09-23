const express = require('express');
const RateLimit = require('express-rate-limit');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const logger = require('../config/logger');
const { verifyChoirApiToken } = require('../middleware/apiToken.middleware');
const { createMcpServer, SERVER_NAME, SERVER_VERSION } = require('../mcp/server');

const router = express.Router();

const PER_MIN = parseInt(process.env.MCP_RATE_LIMIT_PER_MIN, 10) || 60;
const PER_DAY = parseInt(process.env.MCP_RATE_LIMIT_PER_DAY, 10) || 5000;

// Quotas are per token, not per IP: one leaked token cannot exhaust everyone else's budget.
const tokenKey = (req) => String(req.apiToken?.id ?? req.ip);

const minuteLimiter = RateLimit({
    windowMs: 60 * 1000,
    max: PER_MIN,
    keyGenerator: tokenKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded for this API token.' },
});

const dayLimiter = RateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: PER_DAY,
    keyGenerator: tokenKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Daily request quota exceeded for this API token.' },
});

router.use(verifyChoirApiToken, minuteLimiter, dayLimiter);

router.get('/info', (req, res) => {
    res.status(200).json({
        server: SERVER_NAME,
        version: SERVER_VERSION,
        transport: 'streamable-http',
        endpoint: '/mcp',
        choir: req.apiChoir?.name || null,
        scopes: req.apiToken.scopes,
        writeEnabled: req.apiToken.allowWrite,
    });
});

router.post('/', async (req, res) => {
    // Stateless transport: every request gets its own server instance bound to
    // the choir of the presented token, so nothing can leak between tenants.
    const server = createMcpServer(req.apiToken);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

    res.on('close', () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
    });

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (err) {
        logger.error(`[MCP] Request failed for token ${req.apiToken.id}: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal MCP server error' },
                id: null,
            });
        }
    }
});

// Stateless mode has no server-initiated stream and nothing to terminate.
router.all('/', (req, res) => {
    res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed. Use POST for MCP requests.' },
        id: null,
    });
});

module.exports = router;
