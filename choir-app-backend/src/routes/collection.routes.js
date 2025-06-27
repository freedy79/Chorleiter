const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/collection.controller");
const router = require("express").Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/collection-covers'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.use(authJwt.verifyToken);
router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.post("/:id/cover", upload.single('cover'), controller.uploadCover);
router.get("/:id/cover", controller.getCover);
router.post("/:id/addToChoir", controller.addToChoir); // Crucial endpoint
module.exports = router;