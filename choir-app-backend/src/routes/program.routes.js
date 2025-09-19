const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../validators/validate');
const {
  programValidation,
  programUpdateValidation,
  programItemPieceValidation,
  programItemFreePieceValidation,
  programItemBreakValidation,
  programItemSpeechValidation,
  programItemSlotValidation,
  programItemsReorderValidation,
  programItemUpdateValidation,
} = require('../validators/program.validation');
const controller = require('../controllers/program.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

router.get('/last', wrap(controller.findLastPublished));
router.get('/', role.requireDirector, wrap(controller.findAll));
router.get('/:id/pdf', role.requireDirector, wrap(controller.downloadPdf));
router.get('/:id', role.requireDirector, wrap(controller.findOne));
router.delete('/:id', role.requireNonDemo, role.requireDirector, wrap(controller.delete));
router.post('/', role.requireNonDemo, role.requireDirector, programValidation, validate, wrap(controller.create));
router.put('/:id', role.requireNonDemo, role.requireDirector, programUpdateValidation, validate, wrap(controller.update));
router.post('/:id/publish', role.requireNonDemo, role.requireDirector, wrap(controller.publish));
router.post('/:id/items', role.requireNonDemo, role.requireDirector, programItemPieceValidation, validate, wrap(controller.addPieceItem));
router.post('/:id/items/free', role.requireNonDemo, role.requireDirector, programItemFreePieceValidation, validate, wrap(controller.addFreePieceItem));
router.post('/:id/items/speech', role.requireNonDemo, role.requireDirector, programItemSpeechValidation, validate, wrap(controller.addSpeechItem));
router.post('/:id/items/break', role.requireNonDemo, role.requireDirector, programItemBreakValidation, validate, wrap(controller.addBreakItem));
router.post('/:id/items/slot', role.requireNonDemo, role.requireDirector, programItemSlotValidation, validate, wrap(controller.addSlotItem));
router.put(
  '/:id/items/reorder',
  role.requireNonDemo,
  role.requireDirector,
  programItemsReorderValidation,
  validate,
  wrap(controller.reorderItems)
);
router.put(
  '/:id/items/:itemId',
  role.requireNonDemo,
  role.requireDirector,
  programItemUpdateValidation,
  validate,
  wrap(controller.updateItem)
);
router.delete('/:id/items/:itemId', role.requireNonDemo, role.requireDirector, wrap(controller.deleteItem));

module.exports = router;
