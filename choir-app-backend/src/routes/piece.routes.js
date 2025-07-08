const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/piece.controller");
const router = require("express").Router();
const { diskUpload } = require('../utils/upload');
const upload = diskUpload('piece-images');

// Public endpoint to fetch a piece image without authentication
router.get("/:id/image", controller.getImage);

// All other piece routes are protected and require login
router.use(authJwt.verifyToken);

router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);
router.post("/:id/image", upload.single('image'), controller.uploadImage);

module.exports = router;
