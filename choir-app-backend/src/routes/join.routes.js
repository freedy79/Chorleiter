const router = require('express').Router();
const controller = require('../controllers/join.controller');
const { handler: wrap } = require('../utils/async');

router.get('/:token', wrap(controller.getJoinInfo));
router.post('/:token', wrap(controller.joinChoir));

module.exports = router;
