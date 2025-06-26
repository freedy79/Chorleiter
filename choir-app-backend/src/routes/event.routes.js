const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/event.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/last", controller.findLast);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", authJwt.isChoirAdminOrAdmin, controller.delete);
// Later you will add POST for creation: router.post("/", controller.create);

module.exports = router;