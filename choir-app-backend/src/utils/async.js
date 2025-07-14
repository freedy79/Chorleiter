const asyncHandler = require('express-async-handler');

function handler(fn) {
  return asyncHandler(fn);
}

module.exports = { handler };
