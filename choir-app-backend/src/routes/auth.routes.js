const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/auth.controller");
const router = require("express").Router();

router.post("/signup", controller.signup);
router.post("/signin", controller.signin);

router.post("/switch-choir/:choirId", verifyToken, controller.switchChoir);

module.exports = router;
