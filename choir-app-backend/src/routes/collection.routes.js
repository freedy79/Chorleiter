const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/collection.controller");
const router = require("express").Router();
const { diskUpload } = require('../utils/upload');
const upload = diskUpload('collection-covers');

// Public endpoint to fetch a collection's cover image without authentication
router.get("/:id/cover", controller.getCover);

router.use(authJwt.verifyToken);
router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.post("/:id/cover", upload.single('cover'), controller.uploadCover);
router.post("/:id/addToChoir", controller.addToChoir); // Crucial endpoint
module.exports = router;
