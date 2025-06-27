const router = require('express').Router();
const controller = require('../controllers/password-reset.controller');

router.post('/request', controller.requestPasswordReset);
router.post('/reset/:token', controller.resetPassword);

module.exports = router;
