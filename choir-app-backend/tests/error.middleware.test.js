const assert = require('assert');

// Minimal logger stub before requiring error middleware
const logMessages = [];
jest_mock_logger();
function jest_mock_logger() {
  const logger = require('../src/config/logger');
  logger.warn = (...args) => logMessages.push({ level: 'warn', args });
  logger.error = (...args) => logMessages.push({ level: 'error', args });
  logger.info = (...args) => logMessages.push({ level: 'info', args });
}

const { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } = require('../src/utils/errors');
const { errorHandler, asyncHandler, notFoundHandler, sequelizeErrorHandler } = require('../src/middleware/error.middleware');

function makeReq(overrides = {}) {
  return { path: '/test', method: 'GET', userId: 1, activeChoirId: 1, ip: '127.0.0.1', ...overrides };
}

function makeRes() {
  let _status, _json;
  return {
    status(code) { _status = code; return this; },
    json(data) { _json = data; return this; },
    get statusCode() { return _status; },
    get body() { return _json; },
  };
}

const next = () => {};

(async () => {
  try {
    let passed = 0;

    // === errorHandler tests ===

    // 1. AppError (operational) returns correct status and message
    {
      const err = new AppError('Something went wrong', 422, { field: 'name' });
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.statusCode, 422, 'AppError status code');
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.message, 'Something went wrong');
      passed++;
    }

    // 2. ValidationError returns 400
    {
      const err = new ValidationError('Bad input', [{ field: 'title', message: 'required' }]);
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.statusCode, 400, 'ValidationError → 400');
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.message, 'Bad input');
      passed++;
    }

    // 3. AuthenticationError returns 401
    {
      const err = new AuthenticationError();
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.statusCode, 401, 'AuthenticationError → 401');
      passed++;
    }

    // 4. AuthorizationError returns 403
    {
      const err = new AuthorizationError();
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.statusCode, 403, 'AuthorizationError → 403');
      passed++;
    }

    // 5. NotFoundError returns 404
    {
      const err = new NotFoundError('Piece');
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.statusCode, 404, 'NotFoundError → 404');
      assert.ok(res.body.message.includes('Piece'), 'message mentions resource');
      passed++;
    }

    // 6. Generic Error (non-operational) defaults to 500
    {
      const err = new Error('unexpected bug');
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.statusCode, 500, 'Generic error → 500');
      assert.strictEqual(res.body.success, false);
      passed++;
    }

    // 7. Development mode includes stack trace
    {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const err = new AppError('dev error', 400, { hint: 'debug' });
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.ok(res.body.stack, 'stack included in dev mode');
      assert.deepStrictEqual(res.body.details, { hint: 'debug' }, 'details included in dev mode');
      process.env.NODE_ENV = prevEnv;
      passed++;
    }

    // 8. Production mode excludes stack, includes details only for operational errors
    {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const err = new AppError('prod error', 400, { hint: 'visible' });
      const res = makeRes();
      errorHandler(err, makeReq(), res, next);
      assert.strictEqual(res.body.stack, undefined, 'no stack in production');
      assert.deepStrictEqual(res.body.details, { hint: 'visible' }, 'operational details in production');

      // Non-operational error in production - no details
      const err2 = new Error('bug');
      err2.details = { secret: 'hidden' };
      const res2 = makeRes();
      errorHandler(err2, makeReq(), res2, next);
      assert.strictEqual(res2.body.details, undefined, 'no details for non-operational in production');
      process.env.NODE_ENV = prevEnv;
      passed++;
    }

    // === asyncHandler tests ===

    // 9. asyncHandler passes errors to next
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      const handler = asyncHandler(async () => { throw new AppError('async fail', 500); });
      await handler({}, {}, nextFn);
      assert.ok(capturedErr instanceof AppError, 'error passed to next');
      assert.strictEqual(capturedErr.message, 'async fail');
      passed++;
    }

    // 10. asyncHandler calls the function normally when no error
    {
      let called = false;
      const handler = asyncHandler(async (req, res) => { called = true; res.ok = true; });
      const res = {};
      await handler({}, res, next);
      assert.strictEqual(called, true, 'handler called');
      assert.strictEqual(res.ok, true);
      passed++;
    }

    // === notFoundHandler tests ===

    // 11. notFoundHandler creates 404 AppError with path
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      notFoundHandler({ method: 'POST', path: '/api/missing' }, {}, nextFn);
      assert.ok(capturedErr instanceof AppError, 'creates AppError');
      assert.strictEqual(capturedErr.statusCode, 404);
      assert.ok(capturedErr.message.includes('/api/missing'), 'message includes path');
      assert.ok(capturedErr.message.includes('POST'), 'message includes method');
      passed++;
    }

    // === sequelizeErrorHandler tests ===

    // 12. SequelizeValidationError → 400
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      const seqErr = new Error('Validation error');
      seqErr.name = 'SequelizeValidationError';
      seqErr.errors = [{ path: 'title', message: 'cannot be null' }];
      sequelizeErrorHandler(seqErr, makeReq(), makeRes(), nextFn);
      assert.ok(capturedErr instanceof AppError);
      assert.strictEqual(capturedErr.statusCode, 400);
      assert.strictEqual(capturedErr.isOperational, true);
      assert.ok(capturedErr.details.length === 1);
      assert.strictEqual(capturedErr.details[0].field, 'title');
      passed++;
    }

    // 13. SequelizeUniqueConstraintError → 409
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      const seqErr = new Error('Unique constraint');
      seqErr.name = 'SequelizeUniqueConstraintError';
      seqErr.errors = [{ path: 'email' }];
      sequelizeErrorHandler(seqErr, makeReq(), makeRes(), nextFn);
      assert.ok(capturedErr instanceof AppError);
      assert.strictEqual(capturedErr.statusCode, 409);
      assert.ok(capturedErr.message.includes('email'));
      passed++;
    }

    // 14. SequelizeForeignKeyConstraintError → 400
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      const seqErr = new Error('FK error');
      seqErr.name = 'SequelizeForeignKeyConstraintError';
      sequelizeErrorHandler(seqErr, makeReq(), makeRes(), nextFn);
      assert.ok(capturedErr instanceof AppError);
      assert.strictEqual(capturedErr.statusCode, 400);
      assert.ok(capturedErr.isOperational);
      passed++;
    }

    // 15. SequelizeDatabaseError → 500
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      const seqErr = new Error('DB boom');
      seqErr.name = 'SequelizeDatabaseError';
      sequelizeErrorHandler(seqErr, makeReq(), makeRes(), nextFn);
      assert.ok(capturedErr instanceof AppError);
      assert.strictEqual(capturedErr.statusCode, 500);
      passed++;
    }

    // 16. Non-Sequelize error passes through
    {
      let capturedErr = null;
      const nextFn = (err) => { capturedErr = err; };
      const genericErr = new Error('some other error');
      sequelizeErrorHandler(genericErr, makeReq(), makeRes(), nextFn);
      assert.strictEqual(capturedErr, genericErr, 'non-sequelize error passed through');
      passed++;
    }

    console.log(`\n✅ error.middleware.test: All ${passed} tests passed`);
  } catch (err) {
    console.error('❌ error.middleware.test FAILED:', err);
    process.exit(1);
  }
})();
