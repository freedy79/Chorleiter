const router = require('express').Router();
const controller = require('../controllers/client-error.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { handler: wrap } = require('../utils/async');

router.post('/', optionalAuth, wrap(controller.reportError));

module.exports = router;
