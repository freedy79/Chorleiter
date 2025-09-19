const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/library.controller");
const lendingController = require("../controllers/lending.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();
const { createLibraryItemValidation, loanRequestValidation, updateLibraryItemValidation } = require("../validators/library.validation");
const validate = require("../validators/validate");

router.use(authJwt.verifyToken);

router.get('/', wrap(controller.findAll));
router.get('/loans', role.requireLibrarian, wrap(controller.listLoans));
router.put('/loans/:id', role.requireNonDemo, role.requireLibrarian, wrap(controller.updateLoan));
router.post('/loans/:id/end', role.requireNonDemo, role.requireLibrarian, wrap(controller.endLoan));
router.post('/', role.requireNonDemo, role.requireLibrarian, createLibraryItemValidation, validate, wrap(controller.create));
router.post('/import', role.requireNonDemo, role.requireLibrarian, upload.single('csvfile'), wrap(controller.importCsv));
router.put('/:id', role.requireNonDemo, role.requireLibrarian, updateLibraryItemValidation, validate, wrap(controller.update));
router.delete('/:id', role.requireNonDemo, role.requireLibrarian, wrap(controller.remove));
router.post('/:id/borrow', role.requireNonDemo, role.requireDirector, wrap(controller.borrow));
router.post('/:id/return', role.requireNonDemo, role.requireDirector, wrap(controller.returnItem));
router.post('/request', role.requireNonDemo, role.requireDirector, loanRequestValidation, validate, wrap(controller.requestLoan));
router.get('/:id/copies', role.requireLibrarian, wrap(lendingController.list));
router.put('/copies/:id', role.requireNonDemo, role.requireLibrarian, wrap(lendingController.update));
router.get('/:id/copies/pdf', role.requireLibrarian, wrap(lendingController.downloadPdf));

module.exports = router;
