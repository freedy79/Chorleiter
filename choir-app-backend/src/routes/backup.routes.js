const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/backup.controller");
const router = require("express").Router();
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();
const { handler: wrap } = require("../utils/async");

router.use(verifyToken, role.requireAdmin);

router.get('/export', wrap(controller.exportData));
router.post('/import', role.requireNonDemo, upload.single('backup'), wrap(controller.importData));

module.exports = router;
