const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/piece.controller");
const markerController = require("../controllers/audio-marker.controller");
const { createPieceValidation, updatePieceValidation } = require("../validators/piece.validation");
const validate = require("../validators/validate");
const { handler: wrap } = require("../utils/async");
const router = require("express").Router();
const { diskUpload, createFileFilter, ALLOWED_PIECE_FILE_EXT, ALLOWED_PIECE_FILE_MIME } = require('../utils/upload');
const imageUpload = diskUpload('piece-images');
const fileUpload = diskUpload('piece-files', { fileFilter: createFileFilter(ALLOWED_PIECE_FILE_EXT, ALLOWED_PIECE_FILE_MIME) });

// Public endpoints (no authentication required)
router.get("/:id/image", wrap(controller.getImage));
router.get("/:id/image/raw", wrap(controller.getImageRaw));
router.get("/shared/:token", wrap(controller.getByShareToken));
router.get("/shared/:token/og", wrap(controller.getShareOgPage));

// All other piece routes are protected and require login
router.use(authJwt.verifyToken);

router.get("/", wrap(controller.findAll));
router.get("/:id", wrap(controller.findOne));
router.post("/", role.requireNonDemo, role.requireNonSinger, createPieceValidation, validate, wrap(controller.create));
router.put("/:id", role.requireNonDemo, role.requireNonSinger, updatePieceValidation, validate, wrap(controller.update));
router.delete("/:id", role.requireNonDemo, role.requireNonSinger, wrap(controller.delete));
router.post("/:id/report", role.requireNonDemo, wrap(controller.report));
router.post("/:id/share-token", role.requireNonDemo, role.requireNonSinger, wrap(controller.generateShareToken));
router.post("/:id/image", role.requireNonDemo, role.requireNonSinger, imageUpload.single('image'), wrap(controller.uploadImage));
router.post("/link-file", role.requireNonDemo, role.requireNonSinger, fileUpload.single('file'), wrap(controller.uploadLinkFile));
router.delete("/link-file", role.requireNonDemo, role.requireNonSinger, wrap(controller.deleteLinkFile));

// Audio markers on piece links (MP3 time markers)
router.get("/:id/links/:linkId/markers", markerController.getMarkers);
router.post("/:id/links/:linkId/markers", role.requireNonDemo, markerController.createMarker);
router.put("/:id/links/:linkId/markers/:markerId", role.requireNonDemo, markerController.updateMarker);
router.delete("/:id/links/:linkId/markers/:markerId", role.requireNonDemo, markerController.deleteMarker);

module.exports = router;
