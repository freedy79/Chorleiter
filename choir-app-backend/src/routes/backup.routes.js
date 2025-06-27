const { verifyToken, isAdmin } = require("../middleware/auth.middleware");
const controller = require("../controllers/backup.controller");
const router = require("express").Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken, isAdmin);

router.get('/export', controller.exportData);
router.post('/import', upload.single('backup'), controller.importData);

module.exports = router;
