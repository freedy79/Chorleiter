const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/library.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();
const { createLibraryItemValidation, loanRequestValidation, updateLibraryItemValidation } = require("../validators/library.validation");
const validate = require("../validators/validate");

router.use(authJwt.verifyToken);

router.get('/', wrap(controller.findAll));
router.post('/', role.requireLibrarian, createLibraryItemValidation, validate, wrap(controller.create));
router.post('/import', role.requireLibrarian, upload.single('csvfile'), wrap(controller.importCsv));
router.put('/:id', role.requireLibrarian, updateLibraryItemValidation, validate, wrap(controller.update));
router.delete('/:id', role.requireLibrarian, wrap(controller.remove));
router.post('/:id/borrow', role.requireDirector, wrap(controller.borrow));
router.post('/:id/return', role.requireDirector, wrap(controller.returnItem));
router.post('/request', role.requireDirector, loanRequestValidation, validate, wrap(controller.requestLoan));

module.exports = router;
