const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/piece.controller");
const router = require("express").Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/piece-images'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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
