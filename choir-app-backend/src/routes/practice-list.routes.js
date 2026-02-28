const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/practice-list.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

router.get('/', wrap(controller.list));
router.get('/items/membership', wrap(controller.membership));
router.post('/', role.requireNonDemo, wrap(controller.create));
router.put('/:id', role.requireNonDemo, wrap(controller.update));
router.delete('/:id', role.requireNonDemo, wrap(controller.remove));

router.get('/:id/items', wrap(controller.getItems));
router.post('/:id/items', role.requireNonDemo, wrap(controller.addItem));
router.put('/:id/items/:itemId', role.requireNonDemo, wrap(controller.updateItem));
router.delete('/:id/items/:itemId', role.requireNonDemo, wrap(controller.removeItem));
router.put('/:id/items/reorder', role.requireNonDemo, wrap(controller.reorderItems));

router.post('/:id/items/:itemId/pin', role.requireNonDemo, wrap(controller.pinItem));
router.delete('/:id/items/:itemId/pin', role.requireNonDemo, wrap(controller.unpinItem));

module.exports = router;
