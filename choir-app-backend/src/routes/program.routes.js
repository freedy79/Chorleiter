const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../validators/validate');
const { programValidation, programItemPieceValidation } = require('../validators/program.validation');
const controller = require('../controllers/program.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

router.post('/', role.requireDirector, programValidation, validate, wrap(controller.create));
router.post('/:id/items', role.requireDirector, programItemPieceValidation, validate, wrap(controller.addPieceItem));

module.exports = router;
