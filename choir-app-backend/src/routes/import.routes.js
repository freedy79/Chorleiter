const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/import.controller");
const router = require("express").Router();
const { memoryUpload } = require('../utils/upload');
const upload = memoryUpload();
const { handler: wrap } = require("../utils/async");
const role = require("../middleware/role.middleware");

router.use(authJwt.verifyToken);

router.post("/collection/:id", upload.single('csvfile'), wrap(controller.startImportCsvToCollection));
router.post("/events", role.requireDirector, upload.single('csvfile'), wrap(controller.startImportEvents));
router.get("/status/:jobId", wrap(controller.getImportStatus));
module.exports = router;
