const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/collection.controller");
const { createCollectionValidation, updateCollectionValidation } = require("../validators/collection.validation");
const validate = require("../validators/validate");
const router = require("express").Router();
const { diskUpload } = require('../utils/upload');
const upload = diskUpload('collection-covers');

// Public endpoint to fetch a collection's cover image without authentication
router.get("/:id/cover", controller.getCover);

router.use(authJwt.verifyToken);
router.post("/", role.requireNonDemo, createCollectionValidation, validate, controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", role.requireNonDemo, updateCollectionValidation, validate, controller.update);
router.post("/:id/cover", role.requireNonDemo, upload.single('cover'), controller.uploadCover);
router.post("/:id/addToChoir", role.requireNonDemo, controller.addToChoir); // Crucial endpoint
module.exports = router;
