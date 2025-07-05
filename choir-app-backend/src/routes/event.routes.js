const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/event.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/last", controller.findLast);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/range", authJwt.isChoirAdminOrAdmin, controller.deleteRange);
router.delete("/:id", authJwt.isChoirAdminOrAdmin, controller.delete);
router.post("/recalculate-piece-statuses", authJwt.isAdmin, controller.recalculatePieceStatuses);
// Later you will add POST for creation: router.post("/", controller.create);

module.exports = router;