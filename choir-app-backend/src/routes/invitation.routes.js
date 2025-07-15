const router = require('express').Router();
const controller = require('../controllers/invitation.controller');
const { handler: wrap } = require('../utils/async');

router.get('/:token', wrap(controller.getInvitation));
router.post('/:token', wrap(controller.completeRegistration));

module.exports = router;
