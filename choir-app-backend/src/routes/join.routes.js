const router = require('express').Router();
const controller = require('../controllers/join.controller');

router.get('/:token', controller.getJoinInfo);
router.post('/:token', controller.joinChoir);

module.exports = router;
