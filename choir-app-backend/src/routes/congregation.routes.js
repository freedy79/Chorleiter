const router = require('express').Router();
const controller = require('../controllers/congregation.controller');

router.get('/', controller.findAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
