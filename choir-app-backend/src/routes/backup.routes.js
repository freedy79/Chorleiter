const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/backup.controller");
const router = require("express").Router();
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();

router.use(verifyToken, role.requireAdmin);

router.get('/export', controller.exportData);
router.post('/import', upload.single('backup'), controller.importData);

module.exports = router;
