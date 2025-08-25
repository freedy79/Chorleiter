const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../validators/validate');
const { programValidation, programItemPieceValidation, programItemFreePieceValidation, programItemSpeechValidation } = require('../validators/program.validation');
const controller = require('../controllers/program.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

router.post('/', role.requireDirector, programValidation, validate, wrap(controller.create));
router.post('/:id/items', role.requireDirector, programItemPieceValidation, validate, wrap(controller.addPieceItem));
router.post('/:id/items/free', role.requireDirector, programItemFreePieceValidation, validate, wrap(controller.addFreePieceItem));
router.post('/:id/items/speech', role.requireDirector, programItemSpeechValidation, validate, wrap(controller.addSpeechItem));

module.exports = router;
