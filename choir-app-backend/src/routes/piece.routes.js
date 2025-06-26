const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/piece.controller");
const router = require("express").Router();

// All piece routes are protected and require login
router.use(authJwt.verifyToken);

router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;
