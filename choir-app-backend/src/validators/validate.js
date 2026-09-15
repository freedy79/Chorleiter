const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // DEBUG-FORM-REORDER-TEMP: Temporary diagnostics for reorder validation failures.
    const isReorderRoute = req.path.includes('/fields/reorder');
    if (isReorderRoute) {
      // eslint-disable-next-line no-console
      console.warn('[DEBUG-FORM-REORDER-TEMP][VALIDATION]', {
        method: req.method,
        path: req.path,
        body: req.body,
        errors: errors.array(),
      });
      return res.status(400).json({
        errors: errors.array(),
        debugTag: 'DEBUG-FORM-REORDER-TEMP',
        debug: {
          method: req.method,
          path: req.path,
          body: req.body,
        },
      });
    }

    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
