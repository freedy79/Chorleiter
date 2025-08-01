const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/availability.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(auth.verifyToken);

router.get("/:year/:month/all", role.requireChoirAdmin, wrap(controller.findAllByMonth));
router.get("/:year/:month", wrap(controller.findByMonth));
router.put("/", wrap(controller.setAvailability));

module.exports = router;
