const router = require('express').Router();
const controller = require('../controllers/client-error.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');

router.post('/', optionalAuth, role.requireNonDemo, wrap(controller.reportError));

module.exports = router;
