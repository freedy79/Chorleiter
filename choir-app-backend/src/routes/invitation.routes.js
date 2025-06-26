const router = require('express').Router();
const controller = require('../controllers/invitation.controller');

router.get('/:token', controller.getInvitation);
router.post('/:token', controller.completeRegistration);

module.exports = router;
