const router = require('express').Router();
const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/piece-change.controller');
const { handler: wrap } = require('../utils/async');

router.use(authJwt.verifyToken);

router.post('/', wrap(controller.create));
router.get('/', role.requireAdmin, wrap(controller.findAll));
router.get('/:id', role.requireAdmin, wrap(controller.findOne));
router.post('/:id/approve', role.requireAdmin, wrap(controller.approve));
router.delete('/:id', role.requireAdmin, wrap(controller.remove));

module.exports = router;
