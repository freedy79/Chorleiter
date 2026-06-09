const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/availability.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(auth.verifyToken);

router.get("/:year/:month/all", role.requireDienstplanManager, wrap(controller.findAllByMonth));
router.get("/:year/:month/user/:userId", role.requireDienstplanManager, wrap(controller.findByMonthForUser));
router.get("/:year/:month", wrap(controller.findByMonth));
router.put("/:userId", role.requireNonDemo, role.requireDienstplanManager, wrap(controller.setUserAvailability));
router.put("/", role.requireNonDemo, wrap(controller.setAvailability));

module.exports = router;
