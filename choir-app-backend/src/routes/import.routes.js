const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/import.controller");
const router = require("express").Router();
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();

router.use(authJwt.verifyToken);

router.post("/collection/:id", upload.single('csvfile'), controller.startImportCsvToCollection);
router.post("/events", upload.single('csvfile'), controller.startImportEvents);
router.get("/status/:jobId", controller.getImportStatus);
module.exports = router;