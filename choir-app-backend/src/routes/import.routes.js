const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/import.controller");
const router = require("express").Router();
const multer = require('multer');

// Konfiguriere multer, um die Datei im Speicher zu halten (als Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use(authJwt.verifyToken);

router.post("/collection/:id", upload.single('csvfile'), controller.startImportCsvToCollection);
router.post("/events", upload.single('csvfile'), controller.startImportEvents);
router.get("/status/:jobId", controller.getImportStatus);

module.exports = router;