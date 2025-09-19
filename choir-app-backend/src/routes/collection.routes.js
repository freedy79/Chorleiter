const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/collection.controller");
const { createCollectionValidation, updateCollectionValidation } = require("../validators/collection.validation");
const validate = require("../validators/validate");
const router = require("express").Router();
const { diskUpload } = require('../utils/upload');
const upload = diskUpload('collection-covers');
const { handler: wrap } = require("../utils/async");

// Public endpoint to fetch a collection's cover image without authentication
router.get("/:id/cover", wrap(controller.getCover));

router.use(authJwt.verifyToken);
router.post("/", role.requireNonDemo, role.requireChoirAdmin, createCollectionValidation, validate, wrap(controller.create));
router.get("/", wrap(controller.findAll));
router.get("/status/:jobId", wrap(controller.getUpdateStatus));
router.get("/:id", wrap(controller.findOne));
router.put("/:id", role.requireNonDemo, role.requireChoirAdmin, updateCollectionValidation, validate, wrap(controller.update));
router.post("/:id/cover", role.requireNonDemo, role.requireChoirAdmin, upload.single('cover'), wrap(controller.uploadCover));
router.post("/:id/addToChoir", role.requireNonDemo, wrap(controller.addToChoir)); // Crucial endpoint
router.post("/bulkAddToChoir", role.requireNonDemo, wrap(controller.bulkAddToChoir));
module.exports = router;
