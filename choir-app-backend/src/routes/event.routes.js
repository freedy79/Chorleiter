const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/event.controller");
const { createEventValidation } = require("../validators/event.validation");
const validate = require("../validators/validate");
const { handler: wrap } = require("../utils/async");
const router = require("express").Router();

router.get("/ics", wrap(controller.ics));

router.use(authJwt.verifyToken);

router.get("/last", wrap(controller.findLast));
router.get("/next", wrap(controller.findNext));
router.get("/", wrap(controller.findAll));
router.get("/:id", wrap(controller.findOne));
router.post("/", role.requireDirector, createEventValidation, validate, wrap(controller.create));
router.put("/:id", role.requireDirector, wrap(controller.update));
router.delete("/range", role.requireChoirAdmin, wrap(controller.deleteRange));
router.delete("/:id", role.requireChoirAdmin, wrap(controller.delete));
router.post("/recalculate-piece-statuses", role.requireAdmin, wrap(controller.recalculatePieceStatuses));
module.exports = router;
