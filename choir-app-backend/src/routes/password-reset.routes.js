const router = require('express').Router();
const controller = require('../controllers/password-reset.controller');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');

router.post('/request', role.requireNonDemo, wrap(controller.requestPasswordReset));
router.get('/validate/:token', wrap(controller.validateToken));
router.post('/reset/:token', role.requireNonDemo, wrap(controller.resetPassword));

module.exports = router;
