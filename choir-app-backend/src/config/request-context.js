const { AsyncLocalStorage } = require('async_hooks');

// AsyncLocalStorage instance to store request-specific context
const requestContext = new AsyncLocalStorage();

// Middleware to initialize context for each request
function runWithRequestContext(req, res, next) {
  requestContext.run({}, () => next());
}

// Helper to access current context
function getRequestContext() {
  return requestContext.getStore() || {};
}

module.exports = {
  runWithRequestContext,
  getRequestContext,
};
