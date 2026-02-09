const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/piece.controller");
const { createPieceValidation, updatePieceValidation } = require("../validators/piece.validation");
const validate = require("../validators/validate");
const { handler: wrap } = require("../utils/async");
const router = require("express").Router();
const { diskUpload, createFileFilter, ALLOWED_PIECE_FILE_EXT, ALLOWED_PIECE_FILE_MIME } = require('../utils/upload');
const imageUpload = diskUpload('piece-images');
const fileUpload = diskUpload('piece-files', { fileFilter: createFileFilter(ALLOWED_PIECE_FILE_EXT, ALLOWED_PIECE_FILE_MIME) });

// Public endpoints (no authentication required)
router.get("/:id/image", wrap(controller.getImage));
router.get("/shared/:token", wrap(controller.getByShareToken));

// All other piece routes are protected and require login
router.use(authJwt.verifyToken);

router.get("/", wrap(controller.findAll));
router.get("/:id", wrap(controller.findOne));
router.post("/", role.requireNonDemo, createPieceValidation, validate, wrap(controller.create));
router.put("/:id", role.requireNonDemo, updatePieceValidation, validate, wrap(controller.update));
router.delete("/:id", role.requireNonDemo, wrap(controller.delete));
router.post("/:id/report", role.requireNonDemo, wrap(controller.report));
router.post("/:id/share-token", role.requireNonDemo, wrap(controller.generateShareToken));
router.post("/:id/image", role.requireNonDemo, imageUpload.single('image'), wrap(controller.uploadImage));
router.post("/link-file", role.requireNonDemo, fileUpload.single('file'), wrap(controller.uploadLinkFile));
router.delete("/link-file", role.requireNonDemo, wrap(controller.deleteLinkFile));

module.exports = router;
