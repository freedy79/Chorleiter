const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/ota.controller");
const { handler: wrap } = require("../utils/async");
const router = require("express").Router();

// Admin-only: generate, list, revoke
router.post("/generate", verifyToken, role.requireAdmin, role.requireNonDemo, wrap(controller.generate));
router.get("/", verifyToken, role.requireAdmin, wrap(controller.list));
router.delete("/:id", verifyToken, role.requireAdmin, role.requireNonDemo, wrap(controller.revoke));

// Public: consume a token (no auth required)
router.post("/consume/:token", wrap(controller.consume));

module.exports = router;
