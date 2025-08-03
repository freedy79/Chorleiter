const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/library.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();

router.use(authJwt.verifyToken);

router.get('/', wrap(controller.findAll));
router.post('/import', role.requireAdmin, upload.single('csvfile'), wrap(controller.importCsv));
router.post('/:id/borrow', role.requireDirector, wrap(controller.borrow));
router.post('/:id/return', role.requireDirector, wrap(controller.returnItem));

module.exports = router;
