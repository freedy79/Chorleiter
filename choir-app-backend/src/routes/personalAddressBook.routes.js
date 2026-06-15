const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/personalAddressBook.controller');
const router = require('express').Router();
const { handler: wrap } = require('../utils/async');

router.use(auth.verifyToken);

router.get('/', wrap(controller.list));
router.post('/check', wrap(controller.check));
router.post('/bulk', role.requireNonDemo, wrap(controller.createBulk));
router.post('/', role.requireNonDemo, wrap(controller.create));
router.put('/:id', role.requireNonDemo, wrap(controller.update));
router.delete('/:id', role.requireNonDemo, wrap(controller.remove));

module.exports = router;
