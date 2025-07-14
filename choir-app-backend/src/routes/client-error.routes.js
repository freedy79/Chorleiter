const router = require('express').Router();
const controller = require('../controllers/client-error.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/', optionalAuth, controller.reportError);

module.exports = router;
