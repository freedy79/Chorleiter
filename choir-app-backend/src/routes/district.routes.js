const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/district.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.get("/", wrap(controller.getAll));
router.post("/", role.requireNonDemo, role.requireAdmin, wrap(controller.create));
router.put("/:id", role.requireNonDemo, role.requireAdmin, wrap(controller.update));
router.delete("/:id", role.requireNonDemo, role.requireAdmin, wrap(controller.remove));

module.exports = router;
