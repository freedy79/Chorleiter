const router = require('express').Router();
const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/piece-change.controller');

router.use(authJwt.verifyToken);

router.post('/', controller.create);
router.get('/', authJwt.isAdmin, controller.findAll);
router.get('/:id', authJwt.isAdmin, controller.findOne);
router.post('/:id/approve', authJwt.isAdmin, controller.approve);
router.delete('/:id', authJwt.isAdmin, controller.remove);

module.exports = router;
