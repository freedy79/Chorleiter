const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/planRule.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(auth.verifyToken);

router.get("/", wrap(controller.findAll));
router.post("/", role.requireNonDemo, role.requireChoirAdmin, wrap(controller.create));
router.put("/:id", role.requireNonDemo, role.requireChoirAdmin, wrap(controller.update));
router.delete("/:id", role.requireNonDemo, role.requireChoirAdmin, wrap(controller.delete));

module.exports = router;
