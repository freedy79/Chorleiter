const router = require('express').Router();
const controller = require('../controllers/password-reset.controller');
const { handler: wrap } = require('../utils/async');

router.post('/request', wrap(controller.requestPasswordReset));
router.post('/reset/:token', wrap(controller.resetPassword));

module.exports = router;
