const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/author.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.post("/", controller.create);
router.get("/", controller.findAll);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
