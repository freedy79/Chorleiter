const router = require('express').Router();
const controller = require('../controllers/join.controller');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');

router.get('/:token', wrap(controller.getJoinInfo));
router.post('/:token', role.requireNonDemo, wrap(controller.joinChoir));

module.exports = router;
