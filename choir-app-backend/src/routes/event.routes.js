const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/event.controller");
const { createEventValidation } = require("../validators/event.validation");
const validate = require("../validators/validate");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/last", controller.findLast);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.post("/", createEventValidation, validate, controller.create);
router.put("/:id", controller.update);
router.delete("/range", role.requireChoirAdmin, controller.deleteRange);
router.delete("/:id", role.requireChoirAdmin, controller.delete);
router.post("/recalculate-piece-statuses", role.requireAdmin, controller.recalculatePieceStatuses);
// Later you will add POST for creation: router.post("/", controller.create);module.exports = router;