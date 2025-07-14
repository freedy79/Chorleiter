const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/composer.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.post("/", controller.create);
router.get("/", controller.findAll);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);
router.post("/:id/enrich", controller.enrich);

module.exports = router;