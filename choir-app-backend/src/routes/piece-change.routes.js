const router = require('express').Router();
const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/piece-change.controller');

router.use(authJwt.verifyToken);

router.post('/', controller.create);
router.get('/', role.requireAdmin, controller.findAll);
router.get('/:id', role.requireAdmin, controller.findOne);
router.post('/:id/approve', role.requireAdmin, controller.approve);
router.delete('/:id', role.requireAdmin, controller.remove);

module.exports = router;
