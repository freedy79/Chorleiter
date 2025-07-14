const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/piece.controller");
const { createPieceValidation, updatePieceValidation } = require("../validators/piece.validation");
const validate = require("../validators/validate");
const router = require("express").Router();
const { diskUpload } = require('../utils/upload');
const upload = diskUpload('piece-images');

// Public endpoint to fetch a piece image without authentication
router.get("/:id/image", controller.getImage);

// All other piece routes are protected and require login
router.use(authJwt.verifyToken);

router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.post("/", role.requireNonDemo, createPieceValidation, validate, controller.create);
router.put("/:id", role.requireNonDemo, updatePieceValidation, validate, controller.update);
router.delete("/:id", role.requireNonDemo, controller.delete);
router.post("/:id/image", role.requireNonDemo, upload.single('image'), controller.uploadImage);

module.exports = router;
