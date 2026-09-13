console.log('Starting ping.cors.test.js...');
const assert = require('assert');
const http = require('http');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

// Mock request context middleware
require.cache[require.resolve('../src/config/request-context')] = {
  exports: {
    runWithRequestContext: (req, res, next) => next(),
    getRequestContext: () => ({})
  }
};

const app = require('../src/app');

(async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // 1. Test GET /api/ping with Origin https://nak-chorleiter.de
    const res1 = await fetch(`http://127.0.0.1:${port}/api/ping`, {
      headers: { Origin: 'https://nak-chorleiter.de' }
    });
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.message, 'PONG');
    assert.strictEqual(res1.headers.get('access-control-allow-origin'), 'https://nak-chorleiter.de');

    // 2. Test GET /api/ping with Origin https://www.nak-chorleiter.de
    const res2 = await fetch(`http://127.0.0.1:${port}/api/ping`, {
      headers: { Origin: 'https://www.nak-chorleiter.de' }
    });
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(body2.message, 'PONG');
    assert.strictEqual(res2.headers.get('access-control-allow-origin'), 'https://www.nak-chorleiter.de');

    // 3. Test OPTIONS preflight for www.nak-chorleiter.de
    const res3 = await fetch(`http://127.0.0.1:${port}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://www.nak-chorleiter.de',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert.strictEqual(res3.status, 204);
    assert.strictEqual(res3.headers.get('access-control-allow-origin'), 'https://www.nak-chorleiter.de');

    console.log('ping.cors.test.js passed');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
})();
