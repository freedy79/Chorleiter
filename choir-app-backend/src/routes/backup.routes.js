const { verifyToken, isAdmin } = require("../middleware/auth.middleware");
const controller = require("../controllers/backup.controller");
const router = require("express").Router();
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();

router.use(verifyToken, isAdmin);

router.get('/export', controller.exportData);
router.post('/import', upload.single('backup'), controller.importData);

module.exports = router;
