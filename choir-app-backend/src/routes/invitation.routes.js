const router = require('express').Router();
const controller = require('../controllers/invitation.controller');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');

router.get('/:token', wrap(controller.getInvitation));
router.post('/:token', role.requireNonDemo, wrap(controller.completeRegistration));

module.exports = router;
