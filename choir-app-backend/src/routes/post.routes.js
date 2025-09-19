const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/post.controller');
const validate = require('../validators/validate');
const { postValidation } = require('../validators/post.validation');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

router.get('/latest', wrap(controller.findLatest));
router.get('/', wrap(controller.findAll));
router.post('/', role.requireNonDemo, role.requireDirector, postValidation, validate, wrap(controller.create));
router.put('/:id', role.requireNonDemo, postValidation, validate, wrap(controller.update));
router.delete('/:id', role.requireNonDemo, wrap(controller.remove));
router.post('/:id/publish', role.requireNonDemo, wrap(controller.publish));

module.exports = router;
