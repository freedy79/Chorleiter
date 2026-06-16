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

/**
 * Sets a key-value pair in the current request context (no-op outside a request).
 */
function setRequestContext(key, value) {
  const ctx = requestContext.getStore();
  if (ctx) ctx[key] = value;
}

module.exports = {
  runWithRequestContext,
  getRequestContext,
  setRequestContext,
};
